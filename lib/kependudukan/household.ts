/**
 * Kartu Keluarga (KK) sebagai entitas: aturan murni untuk membangun rumah tangga dari kolom `residents.kk`
 * dan mendeteksi masalah kualitas data. Tanpa akses DB; dipakai skrip backfill, pemeriksa kualitas, dan API.
 */

export const KK_HEAD_ROLE = "Kepala Keluarga";

export interface ResidentLite {
  id: number;
  kk: string | null;
  familyRole: string;
  isAlive: boolean;
  /** Terisi bila warga sudah pindah keluar desa. */
  moveDate: Date | null;
  rt: string | null;
  rw: string | null;
  hamlet: string | null;
  address: string;
  birthDate: Date | null;
}

export type HouseholdAnomalyCode =
  | "NO_HEAD"
  | "MULTIPLE_HEADS"
  | "HEAD_NOT_ACTIVE"
  | "SPLIT_ACROSS_RT"
  | "INVALID_KK"
  | "MISSING_KK";

export interface HouseholdAnomaly {
  code: HouseholdAnomalyCode;
  /** Nomor KK terkait; null untuk warga tanpa KK. */
  kk: string | null;
  residentIds: number[];
  message: string;
}

export interface HouseholdPlan {
  kk: string;
  memberIds: number[];
  /** Kepala keluarga terpilih; null bila tidak ada kepala yang aktif atau ambigu. */
  headId: number | null;
  address: string;
  rt: string | null;
  rw: string | null;
  hamlet: string | null;
}

export interface HouseholdBackfillPlan {
  households: HouseholdPlan[];
  /** Warga tanpa KK 16 digit: tidak dimasukkan ke rumah tangga mana pun. */
  unassignedIds: number[];
  anomalies: HouseholdAnomaly[];
}

/** KK valid = tepat 16 digit. Mengembalikan null bila bukan. */
export function normalizeKk(raw: unknown): string | null {
  const d = String(raw ?? "").replace(/\D/g, "");
  return /^\d{16}$/.test(d) ? d : null;
}

const isActive = (r: ResidentLite) => r.isAlive && r.moveDate == null;

function mostCommon(values: (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) {
    const t = v?.trim();
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  return best;
}

/** Sama dengan perbandingan RT/RW di tempat lain: "01" dan "1" dianggap satu RT. */
export function sameRtRw(a: string | null, b: string | null): boolean {
  const norm = (v: string | null) => {
    const t = (v ?? "").trim();
    return /^\d+$/.test(t) ? String(Number(t)) : t.toUpperCase();
  };
  return norm(a) === norm(b);
}

/**
 * Bangun rencana rumah tangga dari daftar warga satu desa. Deterministik (urutan input tidak memengaruhi hasil)
 * dan idempotent: menjalankan ulang pada data yang sama menghasilkan rencana yang sama.
 */
export function planHouseholdBackfill(residents: readonly ResidentLite[]): HouseholdBackfillPlan {
  const byKk = new Map<string, ResidentLite[]>();
  const unassignedIds: number[] = [];
  const anomalies: HouseholdAnomaly[] = [];
  const invalid: number[] = [];
  const missing: number[] = [];

  for (const r of [...residents].sort((a, b) => a.id - b.id)) {
    const raw = r.kk?.trim();
    if (!raw) {
      missing.push(r.id);
      unassignedIds.push(r.id);
      continue;
    }
    const kk = normalizeKk(raw);
    if (!kk) {
      invalid.push(r.id);
      unassignedIds.push(r.id);
      continue;
    }
    const list = byKk.get(kk);
    if (list) list.push(r);
    else byKk.set(kk, [r]);
  }

  if (missing.length) {
    anomalies.push({ code: "MISSING_KK", kk: null, residentIds: missing, message: `${missing.length} warga belum punya nomor KK` });
  }
  if (invalid.length) {
    anomalies.push({ code: "INVALID_KK", kk: null, residentIds: invalid, message: `${invalid.length} warga punya nomor KK yang bukan 16 digit` });
  }

  const households: HouseholdPlan[] = [];
  for (const [kk, members] of [...byKk.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const memberIds = members.map((m) => m.id);
    const heads = members.filter((m) => m.familyRole === KK_HEAD_ROLE);
    const activeHeads = heads.filter(isActive);

    let headId: number | null = null;
    if (activeHeads.length === 1) {
      headId = activeHeads[0].id;
    } else if (activeHeads.length > 1) {
      anomalies.push({ code: "MULTIPLE_HEADS", kk, residentIds: activeHeads.map((h) => h.id), message: `KK ${kk} punya ${activeHeads.length} Kepala Keluarga aktif` });
    } else if (heads.length > 0) {
      // Ada kepala tetapi meninggal/pindah; bila masih ada anggota aktif, KK perlu pergantian kepala.
      if (members.some(isActive)) {
        anomalies.push({ code: "HEAD_NOT_ACTIVE", kk, residentIds: heads.map((h) => h.id), message: `Kepala Keluarga KK ${kk} sudah meninggal/pindah, anggota lain masih aktif` });
      }
    } else if (members.some(isActive)) {
      anomalies.push({ code: "NO_HEAD", kk, residentIds: memberIds, message: `KK ${kk} belum punya Kepala Keluarga` });
    }

    const active = members.filter(isActive);
    const basis = active.length ? active : members;
    const headRow = headId != null ? members.find((m) => m.id === headId) : undefined;
    const ref = headRow ?? basis[0];

    const rtRwSet = new Set(active.map((m) => `${(m.rw ?? "").trim().replace(/^0+(?=\d)/, "")}|${(m.rt ?? "").trim().replace(/^0+(?=\d)/, "")}`));
    if (rtRwSet.size > 1) {
      anomalies.push({ code: "SPLIT_ACROSS_RT", kk, residentIds: active.map((m) => m.id), message: `Anggota KK ${kk} tersebar di lebih dari satu RT/RW` });
    }

    households.push({
      kk,
      memberIds,
      headId,
      address: ref.address,
      rt: headRow?.rt ?? mostCommon(basis.map((m) => m.rt)),
      rw: headRow?.rw ?? mostCommon(basis.map((m) => m.rw)),
      hamlet: headRow?.hamlet ?? mostCommon(basis.map((m) => m.hamlet)),
    });
  }

  return { households, unassignedIds, anomalies };
}
