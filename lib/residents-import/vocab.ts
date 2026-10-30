/**
 * Kosakata baku kependudukan + penyelesai nilai (kode angka, alias, fuzzy).
 * Urutan array kode mengikuti tabel kode Dukcapil/SIAK dan sengaja dibuat eksplisit di sini,
 * dikunci oleh tes (jangan bergantung pada urutan Object.keys konstanta UI).
 */
import {
  BLOOD_TYPE_OPTIONS,
  EDUCATION_OPTIONS,
  JOB_OPTIONS,
  KK_RELATIONSHIP_STATUS,
  MARITAL_STATUS_OPTIONS,
  RELIGION_OPTIONS,
} from "../../utils/constants/user";
import { dice, levenshtein, normalizeText } from "./text";

export type ResolveHow = "exact" | "alias" | "code" | "fuzzy";
export interface Resolved {
  value: string;
  how: ResolveHow;
}

/** Kode 1..n → label. Kode dipakai bila sel berisi angka murni. */
export const CODES = {
  gender: ["Laki-laki", "Perempuan"],
  religion: ["Islam", "Kristen", "Katholik", "Hindu", "Budha", "Khonghucu", "Kepercayaan"],
  marital: ["Belum Menikah", "Menikah", "Cerai Hidup", "Cerai Mati"],
  familyRole: [
    "Kepala Keluarga",
    "Suami",
    "Istri",
    "Anak",
    "Menantu",
    "Cucu",
    "Orang Tua",
    "Mertua",
    "Famili Lain",
    "Pembantu",
    "Lainnya",
  ],
  education: [
    "Tidak/Belum Sekolah",
    "Belum Tamat SD",
    "Tamat SD",
    "SLTP",
    "SLTA",
    "Diploma I/II",
    "Diploma III",
    "Strata I",
    "Strata II",
    "Strata III",
  ],
  blood: ["A", "B", "AB", "O", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Tidak Tahu"],
  /** Kode pekerjaan Dukcapil 1..88 mengikuti urutan JOB_OPTIONS (88 = Wiraswasta); 89 = Lainnya. */
  job: [...Object.keys(JOB_OPTIONS), "Lainnya"],
} as const;

export const OPTIONS = {
  gender: ["Laki-laki", "Perempuan"] as string[],
  religion: Object.keys(RELIGION_OPTIONS),
  marital: Object.keys(MARITAL_STATUS_OPTIONS),
  familyRole: Object.keys(KK_RELATIONSHIP_STATUS),
  education: Object.keys(EDUCATION_OPTIONS),
  blood: Object.keys(BLOOD_TYPE_OPTIONS),
  job: Object.keys(JOB_OPTIONS),
};

interface ResolverSpec {
  options: readonly string[];
  codes?: readonly string[];
  aliases?: Record<string, string>;
  /** Fuzzy: kemiripan Dice minimal; hanya untuk teks ≥ 5 huruf. */
  fuzzy?: number;
  /** Pecah label menjadi varian ("Petani/Pekebun" → "petani", "pekebun"; "(PNS)" → "pns"). */
  splitVariants?: boolean;
}

function labelVariants(label: string, split: boolean): string[] {
  const out = new Set<string>([normalizeText(label)]);
  if (split) {
    const paren = label.match(/\(([^)]+)\)/);
    if (paren) out.add(normalizeText(paren[1]));
    const noParen = label.replace(/\([^)]*\)/g, " ");
    out.add(normalizeText(noParen));
    for (const part of noParen.split("/")) {
      const n = normalizeText(part);
      if (n.length >= 3) out.add(n);
    }
  }
  out.delete("");
  return [...out];
}

function makeResolver(spec: ResolverSpec) {
  const exact = new Map<string, string>();
  const variants: Array<{ v: string; label: string }> = [];
  for (const label of spec.options) {
    for (const v of labelVariants(label, !!spec.splitVariants)) {
      if (!exact.has(v)) exact.set(v, label);
      variants.push({ v, label });
    }
  }
  const aliases = new Map<string, string>();
  for (const [k, v] of Object.entries(spec.aliases ?? {})) aliases.set(normalizeText(k), v);

  return (raw: unknown): Resolved | null => {
    if (raw === null || raw === undefined) return null;
    const text = String(raw).trim();
    if (!text) return null;
    const n = normalizeText(text);
    if (!n) return null;

    if (spec.codes && /^\d{1,2}$/.test(n)) {
      const label = spec.codes[Number(n) - 1];
      if (label) return { value: label, how: "code" };
    }
    const direct = spec.options.find((o) => normalizeText(o) === n);
    if (direct) return { value: direct, how: "exact" };
    const al = aliases.get(n);
    if (al) return { value: al, how: "alias" };
    const ex = exact.get(n);
    if (ex) return { value: ex, how: "exact" };

    if (spec.fuzzy && n.length >= 5) {
      let best: { label: string; score: number } | null = null;
      for (const { v, label } of variants) {
        if (v.length < 4) continue;
        const near = levenshtein(n, v, 2) <= 2 && Math.abs(n.length - v.length) <= 2;
        const score = near ? Math.max(0.9, dice(n, v)) : dice(n, v);
        if (score >= spec.fuzzy && (!best || score > best.score)) best = { label, score };
      }
      if (best) return { value: best.label, how: "fuzzy" };
    }
    return null;
  };
}

export const resolveGender = makeResolver({
  options: OPTIONS.gender,
  codes: CODES.gender,
  aliases: {
    l: "Laki-laki",
    lk: "Laki-laki",
    "laki laki": "Laki-laki",
    lakilaki: "Laki-laki",
    pria: "Laki-laki",
    cowok: "Laki-laki",
    male: "Laki-laki",
    m: "Laki-laki",
    p: "Perempuan",
    pr: "Perempuan",
    wanita: "Perempuan",
    cewek: "Perempuan",
    female: "Perempuan",
    f: "Perempuan",
  },
});

export const resolveReligion = makeResolver({
  options: OPTIONS.religion,
  codes: CODES.religion,
  aliases: {
    katolik: "Katholik",
    catholic: "Katholik",
    "kristen katolik": "Katholik",
    "kristen protestan": "Kristen",
    protestan: "Kristen",
    buddha: "Budha",
    buddhis: "Budha",
    konghucu: "Khonghucu",
    "kong hu cu": "Khonghucu",
    konghuchu: "Khonghucu",
    "khong hu cu": "Khonghucu",
    "kepercayaan terhadap tuhan yme": "Kepercayaan",
    "penghayat kepercayaan": "Kepercayaan",
  },
  fuzzy: 0.8,
});

export const resolveMarital = makeResolver({
  options: OPTIONS.marital,
  codes: CODES.marital,
  aliases: {
    "belum kawin": "Belum Menikah",
    "tidak kawin": "Belum Menikah",
    lajang: "Belum Menikah",
    single: "Belum Menikah",
    bk: "Belum Menikah",
    kawin: "Menikah",
    k: "Menikah",
    nikah: "Menikah",
    "kawin tercatat": "Menikah",
    "kawin belum tercatat": "Menikah",
    "kawin tidak tercatat": "Menikah",
    "sudah menikah": "Menikah",
    "sudah kawin": "Menikah",
    cerai: "Cerai Hidup",
    "cerai hdp": "Cerai Hidup",
    ch: "Cerai Hidup",
    "cerai mati": "Cerai Mati",
    cm: "Cerai Mati",
    janda: "Cerai Mati",
    duda: "Cerai Mati",
  },
  fuzzy: 0.8,
});

export const resolveFamilyRole = makeResolver({
  options: OPTIONS.familyRole,
  codes: CODES.familyRole,
  aliases: {
    kk: "Kepala Keluarga",
    "kepala keluarga": "Kepala Keluarga",
    "kepala rumah tangga": "Kepala Keluarga",
    krt: "Kepala Keluarga",
    "k k": "Kepala Keluarga",
    ortu: "Orang Tua",
    bapak: "Orang Tua",
    ibu: "Orang Tua",
    ayah: "Orang Tua",
    famili: "Famili Lain",
    "famili lainnya": "Famili Lain",
    "anak kandung": "Anak",
    "anak angkat": "Anak",
    "anak tiri": "Anak",
    "pembantu rumah tangga": "Pembantu",
    lain: "Lainnya",
    "lain lain": "Lainnya",
    "lainnya": "Lainnya",
  },
  fuzzy: 0.85,
});

export const resolveEducation = makeResolver({
  options: OPTIONS.education,
  codes: CODES.education,
  aliases: {
    "tidak sekolah": "Tidak/Belum Sekolah",
    "belum sekolah": "Tidak/Belum Sekolah",
    "tidak belum sekolah": "Tidak/Belum Sekolah",
    "tidak pernah sekolah": "Tidak/Belum Sekolah",
    "belum masuk tk kelompok bermain": "Tidak/Belum Sekolah",
    tk: "Tidak/Belum Sekolah",
    paud: "Tidak/Belum Sekolah",
    "tidak tamat sd": "Belum Tamat SD",
    "belum tamat sd sederajat": "Belum Tamat SD",
    "tidak tamat sd sederajat": "Belum Tamat SD",
    "tidak tamat": "Belum Tamat SD",
    sd: "Tamat SD",
    "sd sederajat": "Tamat SD",
    "tamat sd sederajat": "Tamat SD",
    mi: "Tamat SD",
    smp: "SLTP",
    mts: "SLTP",
    "sltp sederajat": "SLTP",
    "smp sederajat": "SLTP",
    sma: "SLTA",
    smk: "SLTA",
    smu: "SLTA",
    ma: "SLTA",
    man: "SLTA",
    "slta sederajat": "SLTA",
    "sma sederajat": "SLTA",
    d1: "Diploma I/II",
    d2: "Diploma I/II",
    "d1 d2": "Diploma I/II",
    "diploma i": "Diploma I/II",
    "diploma ii": "Diploma I/II",
    d3: "Diploma III",
    "akademi diploma iii s muda": "Diploma III",
    akademi: "Diploma III",
    "diploma 3": "Diploma III",
    d4: "Strata I",
    "d iv": "Strata I",
    "diploma iv": "Strata I",
    "diploma iv strata i": "Strata I",
    "d4 s1": "Strata I",
    s1: "Strata I",
    "strata 1": "Strata I",
    sarjana: "Strata I",
    s2: "Strata II",
    "strata 2": "Strata II",
    magister: "Strata II",
    s3: "Strata III",
    "strata 3": "Strata III",
    doktor: "Strata III",
  },
  fuzzy: 0.85,
});

/** Golongan darah dikerjakan manual: normalizeText membuang "+"/"-" sehingga "A+" dan "A" akan bertabrakan. */
export function resolveBlood(raw: unknown): Resolved | null {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).trim();
  if (!text) return null;
  if (/^\d{1,2}$/.test(text)) {
    const label = CODES.blood[Number(text) - 1];
    return label ? { value: label, how: "code" } : null;
  }
  const s = text.toUpperCase().replace(/[\s.]+/g, "");
  const m = s.match(/^(AB|A|B|O)([+-]|POSITIF|NEGATIF|POS|NEG)?$/);
  if (m) {
    const sign = m[2] ? (m[2] === "+" || m[2].startsWith("POS") ? "+" : "-") : "";
    return { value: `${m[1]}${sign}`, how: sign || m[2] === undefined ? "exact" : "alias" };
  }
  if (/^(TIDAKTAHU|TDKTAHU|TT|-)$/.test(s)) return { value: "Tidak Tahu", how: "alias" };
  return null;
}

export const resolveJob = makeResolver({
  options: OPTIONS.job,
  codes: CODES.job,
  splitVariants: true,
  aliases: {
    pns: "Pegawai Negeri Sipil (PNS)",
    asn: "Pegawai Negeri Sipil (PNS)",
    "pegawai negeri": "Pegawai Negeri Sipil (PNS)",
    tni: "Tentara Nasional Indonesia (TNI)",
    polri: "Kepolisian RI (POLRI)",
    polisi: "Kepolisian RI (POLRI)",
    petani: "Petani/Pekebun",
    pekebun: "Petani/Pekebun",
    "petani pekebun": "Petani/Pekebun",
    nelayan: "Nelayan/Perikanan",
    "tidak bekerja": "Belum/Tidak Bekerja",
    "belum bekerja": "Belum/Tidak Bekerja",
    "belum tidak bekerja": "Belum/Tidak Bekerja",
    "tdk bekerja": "Belum/Tidak Bekerja",
    irt: "Mengurus Rumah Tangga",
    "ibu rumah tangga": "Mengurus Rumah Tangga",
    "rumah tangga": "Mengurus Rumah Tangga",
    pelajar: "Pelajar/Mahasiswa",
    mahasiswa: "Pelajar/Mahasiswa",
    "pelajar mahasiswa": "Pelajar/Mahasiswa",
    swasta: "Karyawan Swasta",
    "pegawai swasta": "Karyawan Swasta",
    buruh: "Buruh Harian Lepas",
    "buruh harian": "Buruh Harian Lepas",
    bhl: "Buruh Harian Lepas",
    wiraswasta: "Wiraswasta",
    usaha: "Wiraswasta",
    dagang: "Perdagangan",
    berdagang: "Perdagangan",
    pedagang: "Pedagang",
    "perangkat desa": "Perangkat Desa",
    kades: "Kepala Desa",
    "kepala desa": "Kepala Desa",
    "pensiun": "Pensiunan",
    "pensiunan pns": "Pensiunan",
    "pensiunan tni polri": "Pensiunan",
    supir: "Sopir",
    driver: "Sopir",
    ojek: "Transportasi",
    tukang: "Tukang Kayu",
  },
  fuzzy: 0.86,
});

const NATIONALITY_ALIAS: Record<string, string> = {
  wni: "Indonesia",
  indonesia: "Indonesia",
  "warga negara indonesia": "Indonesia",
  id: "Indonesia",
  wna: "WNA",
  "warga negara asing": "WNA",
  asing: "WNA",
};

export function resolveNationality(raw: unknown): Resolved | null {
  const n = normalizeText(raw);
  if (!n) return null;
  const v = NATIONALITY_ALIAS[n];
  return v ? { value: v, how: "alias" } : null;
}

const YES = new Set(["y", "ya", "yes", "iya", "1", "true", "v", "x", "ada", "benar", "ok"]);
const NO = new Set(["n", "t", "tidak", "no", "0", "false", "tdk", "tidak ada", "bukan", "-", "."]);

/** Y/N longgar; null bila tak dikenali. Sel kosong = false (null di sini → pemanggil memutuskan). */
export function resolveYesNo(raw: unknown): boolean | null {
  if (typeof raw === "boolean") return raw;
  const s = String(raw ?? "").trim();
  if (/^[✓✔]$/.test(s)) return true;
  const n = normalizeText(s);
  if (YES.has(n)) return true;
  if (NO.has(n)) return false;
  return null;
}
