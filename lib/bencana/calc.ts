/** Perhitungan murni kesiapsiagaan: skor kelengkapan aktivitas Destana, temuan, normalisasi RT/RW, dan templat peringatan. */
import { ACTIVITIES, ALERT_LEVELS, HAZARD_TYPES, type ActivityDef, type AlertLevel, type Detector, type HazardType, type ReadinessStatus, type ResilienceLevel } from "./catalog";

/** "01" dan "1" dan "001" satu RT/RW. Selain angka (mis. "A") hanya dirapikan huruf kecil. */
export const normArea = (v: string): string => {
  const t = v.trim().toLowerCase();
  return /^\d+$/.test(t) ? String(Number(t)) : t;
};

/** Semua bentuk tulis yang mungkin ada di data warga ("1", "01", "001") untuk dipakai pada klausa IN di SQL. */
export function areaVariants(v: string): string[] {
  const n = normArea(v);
  if (!/^\d+$/.test(n)) return [n, v.trim()].filter((x, i, a) => a.indexOf(x) === i);
  return [...new Set([n, n.padStart(2, "0"), n.padStart(3, "0"), v.trim()])];
}

export interface AreaTarget {
  rw: string;
  rt: string | null;
}

/** Hapus duplikat dan target yang sudah tercakup (RW penuh mencakup RT di dalamnya). */
export function dedupeTargets(list: AreaTarget[]): AreaTarget[] {
  const rwFull = new Set(list.filter((t) => t.rt === null).map((t) => normArea(t.rw)));
  const seen = new Set<string>();
  const out: AreaTarget[] = [];
  for (const t of list) {
    const key = `${normArea(t.rw)}|${t.rt === null ? "*" : normArea(t.rt)}`;
    if (seen.has(key)) continue;
    if (t.rt !== null && rwFull.has(normArea(t.rw))) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

export const areaLabel = (t: AreaTarget): string => (t.rt === null ? `RW ${t.rw}` : `RT ${t.rt}/RW ${t.rw}`);

export interface ReadinessFacts {
  /** status isian per kode katalog (tanpa baris = BELUM) */
  statuses: Record<string, ReadinessStatus>;
  hazards: number;
  activeVolunteers: number;
  resources: number;
  plansByKind: Record<string, number>;
  /** rencana yang berstatus DITETAPKAN per jenis */
  adoptedByKind: Record<string, number>;
  assessments: number;
}

export interface ReadinessItemView {
  code: string;
  ref: string;
  label: string;
  status: ReadinessStatus;
  /** Data aplikasi menunjukkan ada isian terkait (petunjuk, bukan bukti) */
  detected: string | null;
}

const DETECTORS: Record<Detector, (f: ReadinessFacts) => string | null> = {
  HAZARD: (f) => (f.hazards > 0 ? `${f.hazards} ancaman tercatat` : null),
  VOLUNTEER: (f) => (f.activeVolunteers > 0 ? `${f.activeVolunteers} relawan aktif tercatat` : null),
  RESOURCE: (f) => (f.resources > 0 ? `${f.resources} sumber daya tercatat` : null),
  PLAN_RPB: (f) => ((f.adoptedByKind.RPB ?? 0) > 0 ? "Rencana penanggulangan bencana berstatus ditetapkan" : null),
  PLAN_KONTINJENSI: (f) => ((f.adoptedByKind.KONTINJENSI ?? 0) > 0 ? "Rencana kontinjensi berstatus ditetapkan" : null),
  PLAN_PERDES: (f) => ((f.adoptedByKind.PERDES ?? 0) > 0 ? "Peraturan desa berstatus ditetapkan" : null),
  ASSESSMENT: (f) => (f.assessments > 0 ? "Penilaian tercatat" : null),
};

export function readinessItems(f: ReadinessFacts, defs: readonly ActivityDef[] = ACTIVITIES): ReadinessItemView[] {
  return defs.map((a) => ({
    code: a.code,
    ref: a.ref,
    label: a.label,
    status: f.statuses[a.code] ?? "BELUM",
    detected: a.detector ? DETECTORS[a.detector](f) : null,
  }));
}

export interface ReadinessScore {
  total: number;
  done: number;
  inProgress: number;
  /** selesai / total dalam persen bulat */
  pct: number;
}

/** Kelengkapan aktivitas Program Destana (Pasal 8 ayat 1): hanya butir katalog [V]; butir buatan desa tidak ikut dihitung. */
export function readinessScore(items: ReadinessItemView[]): ReadinessScore {
  const total = items.length;
  const done = items.filter((i) => i.status === "SELESAI").length;
  const inProgress = items.filter((i) => i.status === "SEDANG").length;
  return { total, done, inProgress, pct: total ? Math.round((done / total) * 100) : 0 };
}

export interface AssessmentFact {
  kind: "PENILAIAN" | "EVALUASI";
  doneOn: string;
  level: ResilienceLevel | null;
}

export interface BencanaFinding {
  level: "WARN" | "INFO";
  code: string;
  message: string;
  ref?: string;
}

const dayDiff = (from: string, to: string): number => Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/**
 * Temuan kesiapsiagaan. Yang berdasar aturan menyebut pasalnya [V Peraturan BNPB 7/2025]; selebihnya kebijakan aplikasi.
 */
export function bencanaFindings(args: { today: string; assessments: AssessmentFact[]; hazards: { riskLevel: string; lat: number | null }[]; resources: { kind: string; condition: string; capacity: number | null }[]; activeVolunteers: number; hasShelterOrGather: boolean; adoptedPlans: number }): BencanaFinding[] {
  const out: BencanaFinding[] = [];
  const lastOf = (k: "PENILAIAN" | "EVALUASI") => args.assessments.filter((a) => a.kind === k).map((a) => a.doneOn).sort().at(-1) ?? null;
  const lastA = lastOf("PENILAIAN");
  const lastE = lastOf("EVALUASI");
  if (!lastA) out.push({ level: "INFO", code: "NO_ASSESSMENT", message: "Belum ada penilaian ketangguhan yang dicatat. Penilaian dilakukan mandiri oleh desa dan hasilnya menjadi dasar penetapan tingkat serta rekomendasi untuk perencanaan.", ref: "Peraturan BNPB 7/2025 Pasal 14 dan 15" });
  else if (dayDiff(lastA, args.today) > 3 * 365 + 1) out.push({ level: "WARN", code: "ASSESSMENT_STALE", message: `Penilaian ketangguhan terakhir tanggal ${lastA}: sudah lebih dari 3 tahun. Penilaian dilakukan paling sedikit setiap 3 tahun.`, ref: "Peraturan BNPB 7/2025 Pasal 14 ayat 5" });
  if (lastE === null) {
    if (lastA || args.hazards.length) out.push({ level: "INFO", code: "NO_EVALUATION", message: "Belum ada evaluasi program Destana yang dicatat. Evaluasi dilakukan minimal 1 kali dalam 1 tahun.", ref: "Peraturan BNPB 7/2025 Pasal 19 ayat 2" });
  } else if (dayDiff(lastE, args.today) > 365) out.push({ level: "WARN", code: "EVALUATION_STALE", message: `Evaluasi program terakhir tanggal ${lastE}: sudah lebih dari 1 tahun.`, ref: "Peraturan BNPB 7/2025 Pasal 19 ayat 2" });
  const high = args.hazards.filter((h) => h.riskLevel === "HIGH" || h.riskLevel === "EXTREME");
  if (high.length && !args.hasShelterOrGather) out.push({ level: "WARN", code: "NO_SHELTER", message: `Ada ${high.length} ancaman berisiko tinggi, tetapi belum ada tempat pengungsian atau titik kumpul yang tercatat.` });
  if (args.hazards.length && args.activeVolunteers === 0) out.push({ level: "WARN", code: "NO_VOLUNTEER", message: "Ancaman sudah dicatat, tetapi belum ada relawan/tim siaga aktif yang tercatat." });
  if (args.hazards.length && args.adoptedPlans === 0) out.push({ level: "INFO", code: "NO_PLAN", message: "Belum ada dokumen rencana (penanggulangan, kontinjensi, atau evakuasi) berstatus ditetapkan." });
  const broken = args.resources.filter((r) => r.condition === "RUSAK" || r.condition === "PERLU_PERBAIKAN").length;
  if (broken) out.push({ level: "WARN", code: "RESOURCE_BROKEN", message: `${broken} sumber daya berkondisi rusak atau perlu perbaikan.` });
  return out;
}

/** Templat awal siaran. Operator boleh menyuntingnya; ini bukan teks peringatan resmi dan tidak menggantikan BMKG/BPBD. */
export function alertTemplate(level: AlertLevel, hazard: HazardType | null, area: string | null): { title: string; message: string } {
  const h = hazard ? HAZARD_TYPES[hazard].toLowerCase() : "bencana";
  const where = area ? ` di ${area}` : "";
  const lv = ALERT_LEVELS[level];
  switch (level) {
    case "INFORMASI":
      return { title: `Informasi ${h}${where}`.slice(0, 120), message: `Pemerintah desa menyampaikan informasi terkait ${h}${where}. Pantau pengumuman desa dan informasi resmi BMKG/BPBD.` };
    case "WASPADA":
      return { title: `${lv}: potensi ${h}${where}`.slice(0, 120), message: `Warga diminta waspada terhadap potensi ${h}${where}. Siapkan tas siaga, periksa jalur evakuasi, dan pantau informasi dari desa.` };
    case "SIAGA":
      return { title: `${lv}: ${h}${where}`.slice(0, 120), message: `Status siaga ${h}${where}. Siapkan keluarga untuk mengungsi, kumpulkan dokumen penting, dan ikuti arahan perangkat desa serta relawan.` };
    case "AWAS":
      return { title: `${lv}: ${h}${where}`.slice(0, 120), message: `Status awas ${h}${where}. Segera menuju titik kumpul/tempat pengungsian sesuai jalur evakuasi dan ikuti arahan petugas. Utamakan lansia, anak, ibu hamil, dan penyandang disabilitas.` };
  }
}

/** Jumlah kapasitas orang pada shelter dan titik kumpul (ringkasan). */
export function capacityOf(resources: { kind: string; capacity: number | null }[]): { shelter: number; gather: number } {
  let shelter = 0;
  let gather = 0;
  for (const r of resources) {
    if (r.kind === "SHELTER") shelter += r.capacity ?? 0;
    if (r.kind === "TITIK_KUMPUL") gather += r.capacity ?? 0;
  }
  return { shelter, gather };
}

// ---------------------------------------------------------------------------------------------------------------------
// Isi siaran: tolak tautan/alamat situs dan deretan angka panjang (penipuan lewat akun yang dibobol)
// ---------------------------------------------------------------------------------------------------------------------

/** Huruf mirip Latin (Cyrillic/Yunani) yang lazim dipakai mengelabui penyaring; dilipat ke huruf Latin. */
const LOOKALIKE: Record<string, string> = { а: "a", е: "e", о: "o", р: "p", с: "c", х: "x", у: "y", і: "i", ј: "j", ѕ: "s", ԁ: "d", ӏ: "l", һ: "h", ԛ: "q", ԝ: "w", ο: "o", ν: "v", ρ: "p", ι: "i", α: "a", κ: "k", τ: "t", т: "t", к: "k", м: "m", н: "h", в: "b" };

/** Lipat teks untuk pemeriksaan: NFKC, titik varian ke ".", buang karakter tak terlihat, huruf kecil, lipat huruf mirip. */
export function foldForScan(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF\u00AD]/g, "")
    .replace(/[\u3002\uFF0E\uFF61\u2024\u2027\u00B7\u2022]/g, ".")
    .toLowerCase()
    .replace(/[^\u0000-\u007f]/g, (c) => LOOKALIKE[c] ?? c);
}

const TLD = "com|id|net|org|me|link|xyz|co|app|cc|info|my|web|site|online|shop|store|top|club|live|vip|biz|ly|gl|to|tv|io|ru|cn|tk|ml|ga|cf|gq|pw|ws|in|us|uk|dev|page|click|work|fun|icu|cloud|tech|wa|t";
const URL_SCHEME = /(?:https?|ftp|wa|tg|mailto)\s*:|\/\/|www\s*\./;
const SPOKEN_DOT = new RegExp(`[a-z0-9-]{2,}\\s*[\\(\\[{<]?\\s*(?:dot|titik|d0t)\\s*[\\)\\]}>]?\\s*(?:${TLD})(?![a-z0-9])`);
const COMPACT_DOMAIN = new RegExp(`[a-z0-9-]{2,}\\.(?:${TLD})(?![a-z0-9])`);
/** Alamat surel/akun media sosial dan pintasan chat */
const HANDLE = /[a-z0-9._-]+@[a-z0-9-]+|(?:^|\s)@[a-z0-9_]{3,}|wa\.me|t\.me|bit\.ly/;

/**
 * Mengembalikan pesan galat bila `text` memuat tautan/alamat situs/akun (termasuk variasi spasi, "dot", huruf besar, huruf mirip,
 * karakter lebar penuh) atau deretan >= 8 angka (nomor rekening/telepon), selain pola tanggal dan jam yang wajar. Selain itu null.
 * KETERBATASAN: ini penyaring heuristik, bukan jaminan. Angka yang dieja dengan kata ("nol delapan satu…"), nomor yang dipecah oleh
 * huruf, atau alamat yang disamarkan dengan cara baru dapat lolos. Pertahanan utamanya tetap izin `approve`, pratinjau + konfirmasi,
 * batas siaran, dan log audit.
 */
export function alertContentProblem(raw: string): string | null {
  const t = foldForScan(raw);
  const compact = t.replace(/[\s\u00a0_*~`'"|\\]+/g, "");
  if (URL_SCHEME.test(t) || URL_SCHEME.test(compact) || HANDLE.test(t) || SPOKEN_DOT.test(t) || COMPACT_DOMAIN.test(t) || COMPACT_DOMAIN.test(compact)) {
    return "Tidak boleh memuat tautan, alamat situs, surel, atau akun. Tulis pesan tanpa alamat; arahkan warga ke balai desa atau perangkat desa.";
  }
  // Tanggal dan jam wajar dibuang dulu agar "01-11-2026" atau "08.00-10.00 WIB" tidak dianggap nomor.
  const masked = t
    .replace(/\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/g, " ")
    .replace(/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/g, " ")
    .replace(/\b\d{1,2}[.:]\d{2}(?:\s*(?:-|s\/d|sampai)\s*\d{1,2}[.:]\d{2})?(?:\s*(?:wib|wita|wit))?\b/g, " ");
  if (/\p{Nd}(?:[\s.,\-()+/]*\p{Nd}){7,}/u.test(masked)) {
    return "Tidak boleh memuat deretan angka panjang (mirip nomor rekening atau telepon). Tulis jumlah dengan kata atau angka pendek.";
  }
  return null;
}

/** Label tingkat yang ditambahkan SERVER di depan judul notifikasi, sehingga pengirim tidak dapat memalsukannya. */
export const alertLabel = (level: AlertLevel): string => `[${ALERT_LEVELS[level].toUpperCase()}]`;
