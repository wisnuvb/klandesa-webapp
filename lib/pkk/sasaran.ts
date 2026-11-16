/**
 * Data sasaran posyandu per RT: berapa warga di tiap kelompok sasaran (ibu hamil, balita, ... PUS, WUS).
 *
 * Aturan (permintaan perangkat desa, 2026-11-16):
 *  - Kelompok usia saling lepas dan menjumlahkan ke seluruh warga: balita (0–59 bulan, usia penuh < 5 th),
 *    prasekolah (5 th, 60–71 bulan; ditambahkan karena daftar asli melompat dari 59 bulan ke 6 th),
 *    sekolah & remaja (6–18 th), dewasa (19–59 th), lansia (60 th ke atas).
 *  - Ibu hamil, PUS, dan WUS TUMPANG TINDIH dengan kelompok usia (dan satu sama lain), jadi jangan dijumlahkan.
 *  - WUS: perempuan 15–49 th (semua status perkawinan). PUS: WUS yang berstatus kawin.
 *  - Status warga (filter): "aktif" = hidup dan belum tercatat pindah (bawaan, sama seperti modul KIA);
 *    "pindah" = hidup tetapi sudah tercatat pindah dari desa; "semua" = keduanya. Warga meninggal tidak pernah dihitung.
 */

export const SASARAN_STATUSES = ["aktif", "pindah", "semua"] as const;
export type SasaranStatus = (typeof SASARAN_STATUSES)[number];
export const SASARAN_STATUS_LABEL: Record<SasaranStatus, string> = {
  aktif: "Warga aktif",
  pindah: "Sudah pindah",
  semua: "Aktif + pindah",
};
export const isSasaranStatus = (v: unknown): v is SasaranStatus => (SASARAN_STATUSES as readonly unknown[]).includes(v);
/** Kosong → "aktif"; nilai yang bukan salah satu status → null (ditolak 400 oleh rute). */
export function parseSasaranStatus(raw: string | null): SasaranStatus | null {
  if (raw === null || raw === "") return "aktif";
  return isSasaranStatus(raw) ? raw : null;
}

export const SASARAN_AGE_GROUPS = ["balita", "prasekolah", "sekolah", "dewasa", "lansia"] as const;
export type SasaranGroupKey = (typeof SASARAN_AGE_GROUPS)[number] | "ibuHamil" | "pus" | "wus";

/** `short` = keterangan singkat di kepala kolom; `hint` = penjelasan penuh (tooltip). */
export const SASARAN_COLUMNS: ReadonlyArray<{ key: SasaranGroupKey; label: string; short: string; hint: string; overlap: boolean }> = [
  { key: "ibuHamil", label: "Ibu hamil", short: "tercatat hamil", hint: "Ditandai hamil di data warga", overlap: true },
  { key: "balita", label: "Balita", short: "0–59 bln", hint: "0–59 bulan", overlap: false },
  { key: "prasekolah", label: "Prasekolah", short: "5 th", hint: "5 tahun (60–71 bulan)", overlap: false },
  { key: "sekolah", label: "Sekolah & remaja", short: "6–18 th", hint: "6–18 tahun", overlap: false },
  { key: "dewasa", label: "Dewasa", short: "19–59 th", hint: "19–59 tahun", overlap: false },
  { key: "lansia", label: "Lansia", short: "60+ th", hint: "60 tahun ke atas", overlap: false },
  { key: "pus", label: "PUS", short: "kawin, 15–49 th", hint: "Pasangan usia subur: perempuan kawin 15–49 tahun", overlap: true },
  { key: "wus", label: "WUS", short: "perempuan 15–49 th", hint: "Wanita usia subur: perempuan 15–49 tahun", overlap: true },
];

export const SASARAN_GROUP_LABEL: Record<SasaranGroupKey, string> = Object.fromEntries(
  SASARAN_COLUMNS.map((c) => [c.key, c.label]),
) as Record<SasaranGroupKey, string>;

export const WUS_MIN_AGE = 15;
export const WUS_MAX_AGE = 49;

/** Kolom yang dibaca dari tabel warga; satu-satunya masukan perhitungan. */
export interface SasaranResident {
  birthDate: Date;
  gender: string;
  maritalStatus: string | null;
  isPregnant: boolean | null;
  rt: string | null;
  rw: string | null;
}

/** Usia penuh (tahun) pada `now`, cara hitung sama dengan calculateAge. Null bila tanggal lahir tidak masuk akal. */
export function ageOnDate(birthDate: Date, now: Date): number | null {
  const t = birthDate.getTime();
  if (!Number.isFinite(t) || birthDate > now) return null;
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;
  return age > 130 ? null : age;
}

/** Perempuan menurut data warga ("Perempuan", "P", "wanita", ...). Tidak menebak nilai yang tidak dikenal. */
export function isFemale(gender: string | null | undefined): boolean {
  const k = (gender ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return ["perempuan", "wanita", "p", "pr", "female", "f", "putri", "cewek"].includes(k);
}

/** Status kawin: "Menikah", "Kawin", "Kawin Tercatat", ...; belum kawin dan cerai (hidup/mati) bukan PUS. */
export function isMarried(status: string | null | undefined): boolean {
  const k = (status ?? "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  if (!k || /belum|cerai|janda|duda/.test(k)) return false;
  return /menikah|kawin|nikah/.test(k);
}

/** "1" / "01" / "001" / "RT 01" → "01"; teks tanpa angka dirapikan; kosong → null. */
export function normalizeRtRw(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const digits = s.match(/\d+/);
  if (digits) return String(Number(digits[0])).padStart(2, "0");
  return s.toUpperCase().slice(0, 10);
}

/** Kelompok yang diikuti satu warga. Warga dengan usia tidak valid tidak masuk kelompok usia, PUS, maupun WUS. */
export function groupsOf(r: SasaranResident, now: Date): SasaranGroupKey[] {
  const age = ageOnDate(r.birthDate, now);
  const out: SasaranGroupKey[] = [];
  if (age === null) return r.isPregnant === true ? ["ibuHamil"] : out;
  if (age < 5) out.push("balita");
  else if (age === 5) out.push("prasekolah");
  else if (age <= 18) out.push("sekolah");
  else if (age <= 59) out.push("dewasa");
  else out.push("lansia");
  if (r.isPregnant === true) out.push("ibuHamil");
  if (isFemale(r.gender) && age >= WUS_MIN_AGE && age <= WUS_MAX_AGE) {
    out.push("wus");
    if (isMarried(r.maritalStatus)) out.push("pus");
  }
  return out;
}

export type SasaranCounts = Record<SasaranGroupKey, number> & { total: number };

export interface SasaranRow extends SasaranCounts {
  /** Kunci tetap untuk drill-down: "rw|rt" (kosong = tanpa). */
  key: string;
  rt: string | null;
  rw: string | null;
  label: string;
}

export interface SasaranReport {
  rows: SasaranRow[];
  totals: SasaranCounts;
  /** Warga yang tanggal lahirnya tidak masuk akal (masa depan / > 130 th): tidak masuk kelompok usia. */
  usiaTidakValid: number;
  /** Warga tanpa RT sama sekali (baris "Tanpa RT"). */
  tanpaRt: number;
  dihitungPada: string;
}

const emptyCounts = (): SasaranCounts => ({
  ibuHamil: 0, balita: 0, prasekolah: 0, sekolah: 0, dewasa: 0, lansia: 0, pus: 0, wus: 0, total: 0,
});

export const areaKey = (rw: string | null, rt: string | null) => `${rw ?? ""}|${rt ?? ""}`;

export function areaLabel(rw: string | null, rt: string | null): string {
  if (!rt && !rw) return "Tanpa RT/RW";
  if (!rt) return `Tanpa RT (RW ${rw})`;
  return rw ? `RT ${rt} / RW ${rw}` : `RT ${rt}`;
}

/** Urutan: RW naik, lalu RT naik; baris tanpa RW/RT paling bawah. Angka diurutkan sebagai angka. */
function compareArea(a: { rw: string | null; rt: string | null }, b: { rw: string | null; rt: string | null }): number {
  const cmp = (x: string | null, y: string | null) => {
    if (x === y) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return x.localeCompare(y, "id", { numeric: true });
  };
  return cmp(a.rw, b.rw) || cmp(a.rt, b.rt);
}

export function buildSasaranReport(residents: readonly SasaranResident[], now: Date = new Date()): SasaranReport {
  const byArea = new Map<string, SasaranRow>();
  const totals = emptyCounts();
  let usiaTidakValid = 0;
  let tanpaRt = 0;

  for (const r of residents) {
    const rt = normalizeRtRw(r.rt);
    const rw = normalizeRtRw(r.rw);
    const key = areaKey(rw, rt);
    let row = byArea.get(key);
    if (!row) {
      row = { ...emptyCounts(), key, rt, rw, label: areaLabel(rw, rt) };
      byArea.set(key, row);
    }
    if (!rt) tanpaRt++;
    if (ageOnDate(r.birthDate, now) === null) usiaTidakValid++;
    row.total++;
    totals.total++;
    for (const g of groupsOf(r, now)) {
      row[g]++;
      totals[g]++;
    }
  }

  return {
    rows: [...byArea.values()].sort(compareArea),
    totals,
    usiaTidakValid,
    tanpaRt,
    dihitungPada: now.toISOString(),
  };
}

/** Apakah warga ini termasuk kelompok `group` di area `key` (untuk daftar nama saat angka diklik). */
export function inSasaran(r: SasaranResident, group: SasaranGroupKey | "semua", key: string | null, now: Date): boolean {
  if (key !== null && areaKey(normalizeRtRw(r.rw), normalizeRtRw(r.rt)) !== key) return false;
  return group === "semua" || groupsOf(r, now).includes(group);
}

export const isSasaranGroup = (v: unknown): v is SasaranGroupKey =>
  typeof v === "string" && SASARAN_COLUMNS.some((c) => c.key === v);
