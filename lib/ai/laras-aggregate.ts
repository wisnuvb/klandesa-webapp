import { SMALL_CELL_THRESHOLD } from "@/lib/ai/laras-guard";

/**
 * Agregasi penduduk untuk tool Laras. Murni: menerima baris yang sudah dipilih tanpa kolom identitas
 * (tanpa NIK, KK, nama, alamat, telepon) dan hanya mengembalikan hitungan.
 */

export const RESIDENT_GROUP_BY = [
  "rt",
  "rw",
  "hamlet",
  "gender",
  "age_group",
  "education",
  "occupation",
  "religion",
  "marital_status",
  "desil",
] as const;
export type ResidentGroupBy = (typeof RESIDENT_GROUP_BY)[number];

export const RESIDENT_FLAGS = ["stunting", "disability", "bpjs_kis", "illiterate", "pregnant"] as const;
export type ResidentFlag = (typeof RESIDENT_FLAGS)[number];

export type ResidentRow = {
  gender: string;
  birthDate: Date;
  education: string | null;
  occupation: string | null;
  religion: string;
  maritalStatus: string;
  rt: string | null;
  rw: string | null;
  hamlet: string | null;
  desil: string | null;
  isStunting: boolean | null;
  isDisability: boolean | null;
  isBpjsKis: boolean | null;
  isIlliterate: boolean | null;
  isPregnant: boolean | null;
};

export type ResidentQuery = {
  groupBy?: ResidentGroupBy;
  rt?: string;
  rw?: string;
  hamlet?: string;
  gender?: "Laki-laki" | "Perempuan";
  ageMin?: number;
  ageMax?: number;
  flags?: ResidentFlag[];
  desil?: number;
};

export type Count = number | string;
export type AggregateResult = {
  total: Count | null;
  groups?: Array<{ key: string; count: Count }>;
  note?: string;
};

const MAX_GROUPS = 30;

export function ageYears(birthDate: Date, ref: Date): number {
  let age = ref.getFullYear() - birthDate.getFullYear();
  const m = ref.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birthDate.getDate())) age--;
  return age;
}

export function ageGroupLabel(age: number): string {
  if (age < 5) return "0–4 (balita)";
  if (age < 15) return "5–14";
  if (age < 25) return "15–24";
  if (age < 60) return "25–59";
  return "60+";
}

function parseDesil(desil: string | null): number | null {
  if (!desil) return null;
  const n = parseInt(desil.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

const FLAG_FIELD: Record<ResidentFlag, keyof ResidentRow> = {
  stunting: "isStunting",
  disability: "isDisability",
  bpjs_kis: "isBpjsKis",
  illiterate: "isIlliterate",
  pregnant: "isPregnant",
};

function groupKey(r: ResidentRow, by: ResidentGroupBy, now: Date): string {
  switch (by) {
    case "rt":
      return r.rt?.trim() || "(kosong)";
    case "rw":
      return r.rw?.trim() || "(kosong)";
    case "hamlet":
      return r.hamlet?.trim() || "(kosong)";
    case "gender":
      return r.gender || "(kosong)";
    case "age_group":
      return ageGroupLabel(ageYears(r.birthDate, now));
    case "education":
      return r.education?.trim() || "(kosong)";
    case "occupation":
      return r.occupation?.trim() || "(kosong)";
    case "religion":
      return r.religion?.trim() || "(kosong)";
    case "marital_status":
      return r.maritalStatus?.trim() || "(kosong)";
    case "desil": {
      const d = parseDesil(r.desil);
      return d == null ? "(kosong)" : `Desil ${d}`;
    }
  }
}

/**
 * Terapkan penekanan sel kecil pada hitungan berkelompok.
 * - Kelompok < k digabung ke "lainnya" supaya tidak ada angka kecil yang berdiri sendiri.
 * - Bila sisa "lainnya" masih < k, total tidak ditampilkan (kalau tidak, sisa bisa dihitung = total − kelompok lain).
 */
export function suppressGroups(
  counts: Map<string, number>,
  k = SMALL_CELL_THRESHOLD,
): AggregateResult {
  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  if (total === 0) return { total: 0, groups: [] };
  if (total < k) {
    return { total: `<${k}`, note: "Jumlah terlalu kecil untuk ditampilkan demi melindungi privasi warga." };
  }

  const big = Array.from(counts.entries())
    .filter(([, c]) => c >= k)
    .sort((a, b) => b[1] - a[1]);
  const smallSum = Array.from(counts.values())
    .filter((c) => c < k)
    .reduce((a, b) => a + b, 0);

  const groups: Array<{ key: string; count: Count }> = big
    .slice(0, MAX_GROUPS)
    .map(([key, count]) => ({ key, count }));
  const rest = smallSum + big.slice(MAX_GROUPS).reduce((a, [, c]) => a + c, 0);

  const notes: string[] = [];
  let totalOut: Count | null = total;
  if (rest > 0) {
    if (rest < k) {
      groups.push({ key: "lainnya", count: `<${k}` });
      totalOut = null;
      notes.push("Kelompok kecil (<5) disamarkan, sehingga total keseluruhan juga tidak ditampilkan.");
    } else {
      groups.push({ key: "lainnya (kelompok kecil digabung)", count: rest });
      notes.push("Kelompok dengan kurang dari 5 orang digabung ke 'lainnya' demi privasi.");
    }
  }
  return { total: totalOut, groups, ...(notes.length ? { note: notes.join(" ") } : {}) };
}

export function aggregateResidents(rows: ResidentRow[], q: ResidentQuery, now = new Date()): AggregateResult {
  const flags = q.flags ?? [];
  const filtered = rows.filter((r) => {
    if (q.rt && (r.rt?.trim() ?? "") !== q.rt) return false;
    if (q.rw && (r.rw?.trim() ?? "") !== q.rw) return false;
    if (q.hamlet && (r.hamlet?.trim() ?? "").toLowerCase() !== q.hamlet.toLowerCase()) return false;
    if (q.gender && r.gender !== q.gender) return false;
    if (q.ageMin != null || q.ageMax != null) {
      const a = ageYears(r.birthDate, now);
      if (q.ageMin != null && a < q.ageMin) return false;
      if (q.ageMax != null && a > q.ageMax) return false;
    }
    if (q.desil != null && parseDesil(r.desil) !== q.desil) return false;
    for (const f of flags) if (r[FLAG_FIELD[f]] !== true) return false;
    return true;
  });

  if (!q.groupBy) {
    const n = filtered.length;
    if (n > 0 && n < SMALL_CELL_THRESHOLD) {
      return { total: `<${SMALL_CELL_THRESHOLD}`, note: "Jumlah terlalu kecil untuk ditampilkan demi melindungi privasi warga." };
    }
    return { total: n };
  }

  const counts = new Map<string, number>();
  for (const r of filtered) {
    const key = groupKey(r, q.groupBy, now);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return suppressGroups(counts);
}
