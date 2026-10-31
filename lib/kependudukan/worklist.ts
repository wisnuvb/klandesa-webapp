/**
 * Daftar kerja perbaikan data KK untuk operator desa. Murni.
 * Hanya MENYARANKAN (dengan alasan dan tingkat keyakinan); keputusan dan penerapan tetap di tangan operator.
 * Keluaran hanya berisi id warga, nomor KK utuh milik desa itu sendiri, dan teks alasan, tanpa NIK.
 */
import { KK_HEAD_ROLE, normalizeKk, planHouseholdBackfill, sameRtRw, type HouseholdAnomalyCode, type ResidentLite } from "./household";

export interface WorklistResident extends ResidentLite {
  nik: string;
  name: string;
  gender: string;
  fatherNik: string | null;
  fatherName: string | null;
  motherNik: string | null;
  motherName: string | null;
}

export type Confidence = "TINGGI" | "SEDANG" | "RENDAH";

export type Suggestion =
  | { type: "SET_KK"; residentId: number; kk: string; reason: string; confidence: Confidence }
  | { type: "SET_HEAD"; residentId: number; reason: string; confidence: Confidence }
  | { type: "KEEP_HEAD"; residentId: number; reason: string; confidence: Confidence }
  | { type: "SET_ROLE"; residentId: number; role: string; reason: string; confidence: Confidence };

/** Hubungan keluarga yang tidak baku (mis. "KKKK" atau kosong) ditambahkan di atas anomali rumah tangga. */
export type WorkKind = HouseholdAnomalyCode | "UNKNOWN_ROLE";

export interface WorkItem {
  /** Stabil antar pemanggilan: kind + kk, atau kind + id warga untuk KK kosong/tidak sah. */
  id: string;
  kind: WorkKind;
  kk: string | null;
  residentIds: number[];
  suggestions: Suggestion[];
}

export interface Worklist {
  items: WorkItem[];
  counts: Record<WorkKind, number>;
}

const CONF_RANK: Record<Confidence, number> = { TINGGI: 0, SEDANG: 1, RENDAH: 2 };
const MAX_SUGGESTIONS = 3;
const ADULT_AGE = 17;

const isActive = (r: ResidentLite) => r.isAlive && r.moveDate == null;

function ageYears(birth: Date | null, now: Date): number {
  if (!birth) return 0;
  let a = now.getUTCFullYear() - birth.getUTCFullYear();
  const m = now.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) a -= 1;
  return a;
}

const normAddr = (a: string) => a.trim().toLowerCase().replace(/\s+/g, " ");

/** Nama untuk dibandingkan: huruf kecil, tanpa tanda baca dan gelar/almarhum di depan. */
export function normName(n: string | null | undefined): string {
  return (n ?? "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/^\s*(h|hj|haji|hajjah|alm|almarhum|almarhumah|almh)\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Hubungan keluarga yang dikenal di data desa (kosakata impor + dua nilai yang lazim ada di data). */
export const STANDARD_FAMILY_ROLES: ReadonlySet<string> = new Set([
  "Kepala Keluarga", "Suami", "Istri", "Anak", "Menantu", "Cucu", "Orang Tua", "Mertua", "Famili Lain",
  "Pembantu", "Lainnya", "Saudara", "Tidak Sedarah",
]);
const ROLE_ALIASES: Record<string, { role: string; reason: string }> = {
  kkkk: { role: "Kepala Keluarga", reason: 'Kemungkinan kode "KK" yang terulang; biasanya berarti Kepala Keluarga' },
};
const MIN_PARENT_GAP_YEARS = 12;
const plausibleParent = (parent: Date | null, child: Date | null) =>
  !parent || !child || (child.getTime() - parent.getTime()) / (365.25 * 24 * 3600 * 1000) >= MIN_PARENT_GAP_YEARS;

/** Satu digit hilang dari KK 16 digit menghasilkan `d` (15 digit)? */
function oneDigitMissing(full: string, d: string): boolean {
  if (full.length !== 16 || d.length !== 15) return false;
  for (let i = 0; i < 16; i++) if (full.slice(0, i) + full.slice(i + 1) === d) return true;
  return false;
}

/** Urut kandidat kepala: "Suami" > laki-laki dewasa tertua > dewasa tertua > anggota tertua. */
export function suggestHead(members: readonly ResidentLite[], gender: ReadonlyMap<number, string>, now: Date, exclude: readonly number[] = []): Suggestion | null {
  const pool = members.filter((m) => isActive(m) && !exclude.includes(m.id));
  if (pool.length === 0) return null;
  const byAge = (a: ResidentLite, b: ResidentLite) =>
    (a.birthDate?.getTime() ?? Infinity) - (b.birthDate?.getTime() ?? Infinity) || a.id - b.id;

  const suami = pool.filter((m) => m.familyRole === "Suami").sort(byAge)[0];
  if (suami) return { type: "SET_HEAD", residentId: suami.id, reason: "Tercatat sebagai Suami dalam KK ini", confidence: "TINGGI" };

  const adults = pool.filter((m) => ageYears(m.birthDate, now) >= ADULT_AGE);
  const maleAdult = adults.filter((m) => gender.get(m.id) === "Laki-laki").sort(byAge)[0];
  if (maleAdult) return { type: "SET_HEAD", residentId: maleAdult.id, reason: "Laki-laki dewasa tertua di KK ini", confidence: "SEDANG" };

  const adult = adults.sort(byAge)[0];
  if (adult) return { type: "SET_HEAD", residentId: adult.id, reason: "Anggota dewasa tertua di KK ini", confidence: "RENDAH" };

  const oldest = [...pool].sort(byAge)[0];
  return { type: "SET_HEAD", residentId: oldest.id, reason: "Anggota tertua; belum ada anggota dewasa", confidence: "RENDAH" };
}

export function buildWorklist(residents: readonly WorklistResident[], now: Date = new Date()): Worklist {
  const plan = planHouseholdBackfill(residents);
  const byId = new Map(residents.map((r) => [r.id, r]));
  const gender = new Map(residents.map((r) => [r.id, r.gender]));
  const hhByKk = new Map(plan.households.map((h) => [h.kk, h]));

  // Indeks pendukung untuk saran KK: NIK anggota → KK, dan alamat+RT/RW kepala → KK (hanya bila unik).
  const nikToKk = new Map<string, string>();
  for (const r of residents) {
    const kk = normalizeKk(r.kk);
    if (kk && r.nik) nikToKk.set(r.nik, kk);
  }
  const addrToKks = new Map<string, Set<string>>();
  for (const h of plan.households) {
    if (h.headId == null) continue;
    const head = byId.get(h.headId)!;
    const key = `${normAddr(head.address)}|${(head.rw ?? "").replace(/^0+/, "")}|${(head.rt ?? "").replace(/^0+/, "")}`;
    if (normAddr(head.address).length < 10) continue; // alamat terlalu pendek = tidak khas
    const set = addrToKks.get(key) ?? new Set<string>();
    set.add(h.kk);
    addrToKks.set(key, set);
  }
  const validKks = plan.households.map((h) => h.kk);

  // Indeks nama: siapa bernama X dan di KK sah mana (untuk mencocokkan orang tua dan anak lewat kolom nama ayah/ibu).
  const personsByName = new Map<string, WorklistResident[]>();
  for (const r of residents) {
    const n = normName(r.name);
    if (!n || !normalizeKk(r.kk)) continue;
    personsByName.set(n, [...(personsByName.get(n) ?? []), r]);
  }
  const rtRw = (x: ResidentLite) => `${(x.rw ?? "").replace(/^0+/, "")}|${(x.rt ?? "").replace(/^0+/, "")}`;

  /** KK tempat orang tua bernama `parentName` (berjenis kelamin `gender`) tercatat; disaring umur dan, bila banyak, RT/RW anak. */
  const parentKks = (child: WorklistResident, parentName: string | null, gender: string): { kks: string[]; narrowed: boolean } => {
    const n = normName(parentName);
    if (!n) return { kks: [], narrowed: false };
    const cands = (personsByName.get(n) ?? []).filter((p) => p.id !== child.id && p.gender === gender && plausibleParent(p.birthDate, child.birthDate));
    let kks = [...new Set(cands.map((p) => normalizeKk(p.kk)!))];
    let narrowed = false;
    if (kks.length > 1) {
      const sameArea = [...new Set(cands.filter((p) => rtRw(p) === rtRw(child)).map((p) => normalizeKk(p.kk)!))];
      if (sameArea.length === 1) {
        kks = sameArea;
        narrowed = true;
      }
    }
    return { kks, narrowed };
  };

  /** KK anak-anak yang menyebut `parent` sebagai orang tua (nama + jenis kelamin + umur sesuai). */
  const childrenKks = (parent: WorklistResident): Map<string, number> => {
    const n = normName(parent.name);
    const out = new Map<string, number>();
    if (!n) return out;
    for (const c of residents) {
      const ck = normalizeKk(c.kk);
      if (!ck || c.id === parent.id) continue;
      const named = parent.gender === "Perempuan" ? normName(c.motherName) : normName(c.fatherName);
      if (named === n && plausibleParent(parent.birthDate, c.birthDate)) out.set(ck, (out.get(ck) ?? 0) + 1);
    }
    return out;
  };

  const items: WorkItem[] = [];
  const counts: Record<WorkKind, number> = { NO_HEAD: 0, MULTIPLE_HEADS: 0, HEAD_NOT_ACTIVE: 0, SPLIT_ACROSS_RT: 0, INVALID_KK: 0, MISSING_KK: 0, UNKNOWN_ROLE: 0 };

  const kkSuggestions = (r: WorklistResident, invalidDigits: string | null): Suggestion[] => {
    const best = new Map<string, { reason: string; confidence: Confidence }>();
    const headish = r.familyRole === KK_HEAD_ROLE || r.familyRole.trim().toLowerCase() in ROLE_ALIASES;
    const add = (kk: string, reason: string, confidence: Confidence) => {
      // Pagar konflik: saran "yakin" tidak boleh menimbulkan anomali baru.
      const target = hhByKk.get(kk);
      if (target) {
        if (headish && target.headId != null && target.headId !== r.id) {
          confidence = "RENDAH";
          reason += "; tetapi KK itu sudah punya Kepala Keluarga";
        } else if (confidence === "TINGGI" && (!sameRtRw(target.rt, r.rt) || !sameRtRw(target.rw, r.rw))) {
          confidence = "SEDANG";
          reason += "; RT/RW-nya berbeda dari KK itu";
        }
      }
      const cur = best.get(kk);
      if (!cur || CONF_RANK[confidence] < CONF_RANK[cur.confidence]) best.set(kk, { reason, confidence });
    };

    // 1) Orang tua (lewat NIK, lalu lewat nama + jenis kelamin) tercatat di KK mana.
    const fKk = r.fatherNik ? nikToKk.get(r.fatherNik) : undefined;
    const mKk = r.motherNik ? nikToKk.get(r.motherNik) : undefined;
    if (fKk && mKk && fKk === mKk) add(fKk, "Ayah dan ibunya tercatat di KK ini", "TINGGI");
    else if (fKk || mKk) add((fKk ?? mKk)!, `${fKk ? "Ayah" : "Ibu"}nya tercatat di KK ini`, "SEDANG");

    const f = parentKks(r, r.fatherName, "Laki-laki");
    const m = parentKks(r, r.motherName, "Perempuan");
    const both = f.kks.filter((k) => m.kks.includes(k));
    if (both.length === 1) add(both[0], "Nama ayah dan ibunya cocok dengan anggota KK ini", "TINGGI");
    else if (both.length > 1) both.slice(0, 2).forEach((k) => add(k, "Nama ayah dan ibunya cocok dengan lebih dari satu KK", "RENDAH"));
    else {
      for (const [who, x] of [["Ayah", f], ["Ibu", m]] as const) {
        if (x.kks.length === 1) add(x.kks[0], `Nama ${who.toLowerCase()}nya cocok dengan anggota KK ini${x.narrowed ? " (satu RT/RW)" : ""}`, "SEDANG");
        else if (x.kks.length > 1) x.kks.slice(0, 2).forEach((k) => add(k, `Nama ${who.toLowerCase()}nya cocok dengan lebih dari satu KK`, "RENDAH"));
      }
    }

    // 2) Sebagai orang tua: anak-anak yang menyebut namanya tercatat di KK mana.
    const kids = childrenKks(r);
    if (kids.size === 1) {
      const [[kk, n]] = [...kids.entries()];
      add(kk, n >= 2 ? `${n} anak menyebut dia sebagai orang tua dan tercatat di KK ini` : "Seorang anak menyebut dia sebagai orang tua dan tercatat di KK ini", n >= 2 ? "TINGGI" : "SEDANG");
    } else if (kids.size > 1) {
      [...kids.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).forEach(([kk]) => add(kk, "Anak yang menyebut dia sebagai orang tua tercatat di lebih dari satu KK", "RENDAH"));
    }

    // 3) KK diketik kurang satu angka. Karena nomor KK sering hanya beda di 4 digit akhir, kandidatnya bisa banyak;
    //    bukti keluarga di atas yang menentukan.
    if (invalidDigits && invalidDigits.length === 15) {
      const cands = validKks.filter((k) => oneDigitMissing(k, invalidDigits));
      for (const k of cands) {
        if (best.has(k)) add(k, "Hanya kurang satu angka dari KK ini, dan keluarganya cocok", "TINGGI");
        else if (cands.length === 1) add(k, "Hanya kurang satu angka dari KK ini (kemungkinan salah ketik)", "TINGGI");
        else add(k, "Kurang satu angka dari KK ini, tetapi ada beberapa kemungkinan", "RENDAH");
      }
    }

    // 4) Alamat dan RT/RW sama dengan kepala satu-satunya KK (hanya bila alamatnya khas).
    if (normAddr(r.address).length >= 10) {
      const set = addrToKks.get(`${normAddr(r.address)}|${rtRw(r)}`);
      if (set && set.size === 1) add([...set][0], "Alamat dan RT/RW sama dengan kepala keluarga KK ini", "SEDANG");
    }

    return [...best.entries()]
      .map(([kk, v]) => ({ type: "SET_KK" as const, residentId: r.id, kk, reason: v.reason, confidence: v.confidence }))
      .sort((a, b) => CONF_RANK[a.confidence] - CONF_RANK[b.confidence])
      .slice(0, MAX_SUGGESTIONS);
  };

  // Hubungan keluarga tak baku: satu item per warga.
  for (const r of residents) {
    if (STANDARD_FAMILY_ROLES.has(r.familyRole)) continue;
    const alias = ROLE_ALIASES[r.familyRole.trim().toLowerCase()];
    items.push({
      id: `UNKNOWN_ROLE:${r.id}`,
      kind: "UNKNOWN_ROLE",
      kk: null,
      residentIds: [r.id],
      suggestions: alias ? [{ type: "SET_ROLE", residentId: r.id, role: alias.role, reason: alias.reason, confidence: "SEDANG" }] : [],
    });
    counts.UNKNOWN_ROLE += 1;
  }

  for (const a of plan.anomalies) {
    if (a.code === "MISSING_KK" || a.code === "INVALID_KK") {
      for (const id of a.residentIds) {
        const r = byId.get(id)! as WorklistResident;
        const digits = a.code === "INVALID_KK" ? (r.kk ?? "").replace(/\D/g, "") : null;
        items.push({ id: `${a.code}:${id}`, kind: a.code, kk: null, residentIds: [id], suggestions: kkSuggestions(r, digits) });
        counts[a.code] += 1;
      }
      continue;
    }

    const members = (hhByKk.get(a.kk!)?.memberIds ?? []).map((id) => byId.get(id)!);
    const suggestions: Suggestion[] = [];
    if (a.code === "NO_HEAD") {
      const s = suggestHead(members, gender, now);
      if (s) suggestions.push(s);
    } else if (a.code === "HEAD_NOT_ACTIVE") {
      const s = suggestHead(members, gender, now, a.residentIds);
      if (s) suggestions.push(s);
    } else if (a.code === "MULTIPLE_HEADS") {
      const oldest = a.residentIds.map((id) => byId.get(id)!).sort((x, y) => (x.birthDate?.getTime() ?? Infinity) - (y.birthDate?.getTime() ?? Infinity) || x.id - y.id)[0];
      suggestions.push({ type: "KEEP_HEAD", residentId: oldest.id, reason: "Tertua di antara yang tercatat sebagai Kepala Keluarga; yang lain perlu diberi hubungan keluarga yang benar", confidence: "RENDAH" });
    }
    items.push({ id: `${a.code}:${a.kk}`, kind: a.code, kk: a.kk, residentIds: a.residentIds, suggestions });
    counts[a.code] += 1;
  }

  // Urutan kerja: yang paling merusak dulu (KK tak bisa dipakai), lalu KK tanpa kepala, lalu sisanya; yang ada saran yakin lebih dulu.
  const ORDER: WorkKind[] = ["INVALID_KK", "MISSING_KK", "UNKNOWN_ROLE", "MULTIPLE_HEADS", "NO_HEAD", "HEAD_NOT_ACTIVE", "SPLIT_ACROSS_RT"];
  const best = (i: WorkItem) => (i.suggestions.length ? CONF_RANK[i.suggestions[0].confidence] : 3);
  items.sort((x, y) => ORDER.indexOf(x.kind) - ORDER.indexOf(y.kind) || best(x) - best(y) || (x.id < y.id ? -1 : 1));

  return { items, counts };
}

export { KK_HEAD_ROLE };
