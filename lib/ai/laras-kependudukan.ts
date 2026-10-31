import { prisma } from "@/lib/prisma";
import { suppressSmallCount } from "@/lib/ai/laras-guard";
import { KK_HEAD_ROLE, planHouseholdBackfill, type ResidentLite } from "@/lib/kependudukan/household";
import { netPopulationChange, summarizeByMonth, summarizeByRtRw, type MutationRow, type MutationSummary } from "@/lib/kependudukan/report";
import { STANDARD_FAMILY_ROLES } from "@/lib/kependudukan/worklist";
import { isKependudukanV2 } from "@/lib/kependudukan/sync";

/**
 * Tool baca-saja untuk kependudukan Fase 1 (KK, kualitas data KK, mutasi).
 * - Nomor KK, nama, NIK, alamat TIDAK PERNAH dikembalikan. Nomor KK hanya dipakai di memori server untuk mengelompokkan
 *   rumah tangga lalu dibuang; pesan anomali (yang memuat nomor KK) tidak diteruskan, hanya jumlahnya.
 * - Statistik rumah tangga dihitung dari kolom lama `residents` (sumber kebenaran, tetap benar walau bendera v2 mati).
 * - Mutasi memakai buku mutasi bila bendera v2 hidup; bila mati, perkiraan dari tanggal lahir/meninggal/pindah di data warga,
 *   diberi label jelas dan tanpa angka "pindah datang" (tidak ada datanya).
 * - Hitungan kecil: rincian per wilayah dan kelompok berisiko (perempuan kepala KK, lansia sendiri) disamarkan <5.
 *   Total desa per bulan tidak disamarkan karena sama dengan laporan mutasi bulanan resmi.
 */

const DAY = 86_400_000;
const LIST_CAP = 40;

export const HOUSEHOLD_GROUP_BY = ["rw", "rt", "hamlet"] as const;
export type HouseholdGroupBy = (typeof HOUSEHOLD_GROUP_BY)[number];

export type HouseholdRow = ResidentLite & { gender: string };

const isActive = (r: { isAlive: boolean; moveDate: Date | null }) => r.isAlive && r.moveDate == null;
const tok = (v: string | null) => {
  const t = (v ?? "").trim();
  return t === "" ? "-" : /^\d+$/.test(t) ? String(Number(t)) : t.toUpperCase();
};
const ageYears = (b: Date | null, now: Date) => (b ? (now.getTime() - b.getTime()) / (365.25 * DAY) : 0);

export function summarizeHouseholds(rows: HouseholdRow[], groupBy: HouseholdGroupBy | undefined, v2Active: boolean, now = new Date()) {
  const plan = planHouseholdBackfill(rows.map((r) => ({ ...r, address: "" })));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const activeRows = rows.filter(isActive);

  type Hh = { kk: string; size: number; rt: string | null; rw: string | null; hamlet: string | null };
  const households: Hh[] = [];
  let femaleHeads = 0;
  let elderlyAlone = 0;
  const sizeBuckets = new Map<string, number>();
  for (const h of plan.households) {
    const active = h.memberIds.map((id) => byId.get(id)!).filter(isActive);
    if (active.length === 0) continue;
    households.push({ kk: h.kk, size: active.length, rt: h.rt, rw: h.rw, hamlet: h.hamlet });
    const bucket = active.length >= 6 ? "6+" : String(active.length);
    sizeBuckets.set(bucket, (sizeBuckets.get(bucket) ?? 0) + 1);
    const head = h.headId != null ? byId.get(h.headId) : undefined;
    if (head && head.gender === "Perempuan") femaleHeads += 1;
    if (active.length === 1 && ageYears(active[0]!.birthDate, now) >= 60) elderlyAlone += 1;
  }

  const inHouseholds = households.reduce((s, h) => s + h.size, 0);
  const activeKk = new Set(households.map((h) => h.kk));
  const problemKk = new Set<string>();
  const count = (code: string) => plan.anomalies.filter((a) => a.code === code).length;
  for (const a of plan.anomalies) if (a.kk && activeKk.has(a.kk)) problemKk.add(a.kk);
  const activeIdsOf = (code: string) =>
    plan.anomalies.filter((a) => a.code === code).flatMap((a) => a.residentIds).filter((id) => {
      const r = byId.get(id);
      return r ? isActive(r) : false;
    }).length;

  let per_kelompok: { kelompok: string; jumlah_kk: number; jumlah_jiwa: number }[] | undefined;
  if (groupBy) {
    const m = new Map<string, { kelompok: string; jumlah_kk: number; jumlah_jiwa: number }>();
    for (const h of households) {
      const label =
        groupBy === "hamlet"
          ? h.hamlet?.trim() || "(dusun tidak diisi)"
          : groupBy === "rw"
            ? `RW ${tok(h.rw)}`
            : `RW ${tok(h.rw)} / RT ${tok(h.rt)}`;
      const cur = m.get(label) ?? { kelompok: label, jumlah_kk: 0, jumlah_jiwa: 0 };
      cur.jumlah_kk += 1;
      cur.jumlah_jiwa += h.size;
      m.set(label, cur);
    }
    per_kelompok = [...m.values()].sort((a, b) => b.jumlah_kk - a.jumlah_kk).slice(0, LIST_CAP);
  }

  const bersih = households.length > 0 ? Math.round(((households.length - problemKk.size) / households.length) * 100) : null;
  return {
    jumlah_penduduk_aktif: activeRows.length,
    jumlah_kk_aktif: households.length,
    rata_rata_anggota_per_kk: households.length > 0 ? Math.round((inHouseholds / households.length) * 10) / 10 : null,
    ukuran_kk: ["1", "2", "3", "4", "5", "6+"].map((u) => ({ anggota: u, jumlah_kk: suppressSmallCount(sizeBuckets.get(u) ?? 0) })),
    kk_dikepalai_perempuan: suppressSmallCount(femaleHeads),
    kk_dengan_lansia_tinggal_sendiri: suppressSmallCount(elderlyAlone),
    ...(per_kelompok ? { per_kelompok } : {}),
    kualitas_data_kk: {
      persen_kk_tanpa_masalah: bersih,
      warga_aktif_tanpa_nomor_kk: activeIdsOf("MISSING_KK"),
      warga_aktif_nomor_kk_tidak_sah: activeIdsOf("INVALID_KK"),
      kk_tanpa_kepala_keluarga: count("NO_HEAD"),
      kk_kepala_keluarga_ganda: count("MULTIPLE_HEADS"),
      kk_kepala_sudah_tidak_aktif: count("HEAD_NOT_ACTIVE"),
      kk_anggota_tersebar_lintas_rt: count("SPLIT_ACROSS_RT"),
      warga_hubungan_keluarga_tidak_baku: activeRows.filter((r) => !STANDARD_FAMILY_ROLES.has(r.familyRole)).length,
      catatan: "Warga tanpa nomor KK sah tidak masuk hitungan KK. Perbaikan dilakukan lewat halaman Kualitas Data di menu Data Warga.",
    },
    pencatatan_mutasi_v2_aktif: v2Active,
    catatan:
      `Dihitung dari data warga aktif (hidup dan belum pindah). Kepala keluarga diambil dari hubungan keluarga "${KK_HEAD_ROLE}". ` +
      "Nomor KK, nama, dan alamat tidak disertakan; jumlah kurang dari 5 pada kelompok tertentu disamarkan.",
  };
}

export async function householdStatsForAi(villageId: number, settings: unknown, groupBy?: HouseholdGroupBy) {
  const rows = await prisma.resident.findMany({
    where: { villageId },
    // Sengaja tanpa nama, nik, alamat, telepon. `kk` hanya dipakai untuk pengelompokan di memori dan tidak dikembalikan.
    select: { id: true, kk: true, familyRole: true, isAlive: true, moveDate: true, rt: true, rw: true, hamlet: true, birthDate: true, gender: true },
    take: 200_000,
  });
  return summarizeHouseholds(rows as unknown as HouseholdRow[], groupBy, isKependudukanV2(settings));
}

// ---------- mutasi penduduk ----------

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Awal bulan (UTC) `months-1` bulan sebelum bulan berjalan. */
export function mutationWindow(months: number, now = new Date()) {
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  return { from, fromStr: ymd(from), toStr: ymd(now) };
}

function monthKeys(fromStr: string, toStr: string): string[] {
  const out: string[] = [];
  let y = Number(fromStr.slice(0, 4));
  let m = Number(fromStr.slice(5, 7));
  const end = toStr.slice(0, 7);
  for (;;) {
    const k = `${y}-${String(m).padStart(2, "0")}`;
    out.push(k);
    if (k >= end || out.length > 36) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

const zero = (): MutationSummary => ({ BIRTH: 0, DEATH: 0, MOVE_OUT: 0, MOVE_IN: 0, KK_CHANGE: 0 });

export type MutationSource = "buku_mutasi" | "perkiraan_data_warga";

export function summarizeMutations(
  rows: MutationRow[],
  fromStr: string,
  toStr: string,
  source: MutationSource,
  pending?: { type: string; createdAt: Date }[],
  now = new Date(),
) {
  const exact = source === "buku_mutasi";
  const byMonth = summarizeByMonth(rows, fromStr, toStr);
  const total = zero();
  const per_bulan = monthKeys(fromStr, toStr).map((k) => {
    const s = byMonth.get(k) ?? zero();
    for (const t of Object.keys(total) as (keyof MutationSummary)[]) total[t] += s[t];
    return {
      bulan: k,
      lahir: s.BIRTH,
      meninggal: s.DEATH,
      pindah_keluar: s.MOVE_OUT,
      pindah_datang: exact ? s.MOVE_IN : null,
      perubahan_bersih: netPopulationChange(s),
    };
  });

  const wilayah = [...summarizeByRtRw(rows, fromStr, toStr).entries()]
    .map(([nama, s]) => ({ nama, s, n: s.BIRTH + s.DEATH + s.MOVE_OUT + s.MOVE_IN }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 20)
    .map(({ nama, s }) => ({
      wilayah: nama,
      lahir: suppressSmallCount(s.BIRTH),
      meninggal: suppressSmallCount(s.DEATH),
      pindah_keluar: suppressSmallCount(s.MOVE_OUT),
      pindah_datang: exact ? suppressSmallCount(s.MOVE_IN) : null,
    }));

  const pendingByType = new Map<string, number>();
  let oldest = 0;
  for (const p of pending ?? []) {
    pendingByType.set(p.type, (pendingByType.get(p.type) ?? 0) + 1);
    oldest = Math.max(oldest, Math.floor((now.getTime() - p.createdAt.getTime()) / DAY));
  }

  return {
    sumber: source,
    periode: { dari: fromStr, sampai: toStr },
    total_periode: {
      lahir: total.BIRTH,
      meninggal: total.DEATH,
      pindah_keluar: total.MOVE_OUT,
      pindah_datang: exact ? total.MOVE_IN : null,
      ...(exact ? { perubahan_kk: total.KK_CHANGE } : {}),
      perubahan_bersih: netPopulationChange(total),
    },
    per_bulan,
    per_wilayah: wilayah,
    ...(exact
      ? {
          menunggu_keputusan: {
            jumlah: pending?.length ?? 0,
            per_jenis: [...pendingByType.entries()].map(([jenis, jumlah]) => ({ jenis, jumlah })),
            tertua_hari: pending?.length ? oldest : null,
          },
        }
      : {}),
    catatan: exact
      ? "Dari buku mutasi (hanya mutasi yang sudah diterapkan, menurut tanggal kejadian). Nama dan NIK tidak disertakan; rincian per wilayah yang kurang dari 5 disamarkan."
      : "PERKIRAAN dari tanggal lahir, meninggal, dan pindah keluar pada data warga karena pencatatan mutasi belum diaktifkan untuk desa ini. " +
        "Data pindah datang tidak tersedia, jadi perubahan bersih tidak lengkap. Sampaikan keterbatasan ini kepada pengguna.",
  };
}

export async function populationMutationsForAi(villageId: number, settings: unknown, months: number, now = new Date()) {
  const { from, fromStr, toStr } = mutationWindow(months, now);

  if (isKependudukanV2(settings)) {
    const [applied, pending] = await Promise.all([
      prisma.residentMutation.findMany({
        where: { villageId, status: "APPLIED", effectiveDate: { gte: from } },
        select: { type: true, effectiveDate: true, rt: true, rw: true },
        take: 20_000,
      }),
      prisma.residentMutation.findMany({
        where: { villageId, status: "PENDING" },
        select: { type: true, createdAt: true },
        take: 2000,
      }),
    ]);
    const rows: MutationRow[] = applied.map((m) => ({ type: m.type as MutationRow["type"], effectiveDate: ymd(m.effectiveDate), rt: m.rt, rw: m.rw }));
    return summarizeMutations(rows, fromStr, toStr, "buku_mutasi", pending, now);
  }

  const [born, died, moved] = await Promise.all([
    prisma.resident.findMany({ where: { villageId, birthDate: { gte: from } }, select: { birthDate: true, rt: true, rw: true }, take: 20_000 }),
    prisma.resident.findMany({ where: { villageId, deathDate: { gte: from } }, select: { deathDate: true, rt: true, rw: true }, take: 20_000 }),
    prisma.resident.findMany({ where: { villageId, moveDate: { gte: from } }, select: { moveDate: true, rt: true, rw: true }, take: 20_000 }),
  ]);
  const rows: MutationRow[] = [
    ...born.map((r) => ({ type: "BIRTH" as const, effectiveDate: ymd(r.birthDate), rt: r.rt, rw: r.rw })),
    ...died.filter((r) => r.deathDate).map((r) => ({ type: "DEATH" as const, effectiveDate: ymd(r.deathDate!), rt: r.rt, rw: r.rw })),
    ...moved.filter((r) => r.moveDate).map((r) => ({ type: "MOVE_OUT" as const, effectiveDate: ymd(r.moveDate!), rt: r.rt, rw: r.rw })),
  ];
  return summarizeMutations(rows, fromStr, toStr, "perkiraan_data_warga", undefined, now);
}
