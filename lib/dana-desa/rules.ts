/**
 * Aturan penggunaan Dana Desa, DIVERSI PER TAHUN ANGGARAN. Murni (tanpa Prisma), aman untuk klien.
 * Aturan berubah hampir tiap tahun (Permendesa PDT + PMK baru), jadi angka dan daftar hanya boleh ada di sini, dengan sumber pasalnya.
 * Tahun yang belum punya katalog memakai katalog terdekat dan ditandai SEMENTARA di layar.
 *
 * TA 2026 [V = dibaca dari teks resmi]:
 *  - Permendesa PDT 16/2025 (Berita Negara 2025), Pasal 2-3, 8-12 dan Lampiran II.A, F, I, J.
 *  - PMK 7/2026, Pasal 15, 20, 23-25 (peraturan.bpk.go.id/Download/407704/2026pmkeuangan007.pdf).
 */

export const FOCUS = {
  KEMISKINAN_EKSTREM: { letter: "a", label: "Penanganan kemiskinan ekstrem (BLT Desa)", national: true },
  IKLIM_BENCANA: { letter: "b", label: "Desa berketahanan iklim dan tangguh bencana", national: true },
  KESEHATAN: { letter: "c", label: "Promosi dan layanan dasar kesehatan skala Desa", national: true },
  PANGAN_EKONOMI: { letter: "d", label: "Ketahanan pangan/lumbung pangan, energi, dan lembaga ekonomi Desa", national: true },
  KDMP: { letter: "e", label: "Dukungan Koperasi Desa Merah Putih (angsuran gerai, pergudangan, kelengkapan)", national: true },
  PADAT_KARYA: { letter: "f", label: "Infrastruktur Desa melalui Padat Karya Tunai Desa", national: true },
  DIGITAL: { letter: "g", label: "Infrastruktur digital dan teknologi Desa", national: true },
  SEKTOR_LAIN: { letter: "h", label: "Program sektor prioritas lainnya (hasil musyawarah Desa)", national: false },
  OPERASIONAL: { letter: "", label: "Operasional Pemerintah Desa", national: false },
} as const;
export type FocusKey = keyof typeof FOCUS;
export const FOCUS_KEYS = Object.keys(FOCUS) as FocusKey[];
export const isFocusKey = (v: unknown): v is FocusKey => typeof v === "string" && v in FOCUS;

/** Saran penandaan dari kode kegiatan (hanya saran; operator yang memutuskan). */
export function suggestFocus(activityCode: string): FocusKey | null {
  if (activityCode.startsWith("1.")) return "OPERASIONAL";
  if (activityCode.startsWith("5.")) return "IKLIM_BENCANA";
  if (activityCode.startsWith("2.2.")) return "KESEHATAN";
  if (activityCode.startsWith("2.3.") || activityCode.startsWith("2.4.")) return "PADAT_KARYA";
  if (activityCode.startsWith("2.6.")) return "DIGITAL";
  return null;
}

export const PUBLICATION_CHANNELS = {
  SISTEM_INFORMASI: "Sistem informasi Desa",
  BALIHO: "Baliho",
  PAPAN_INFORMASI: "Papan informasi Desa",
  WEBSITE: "Website Desa",
  MEDIA_SOSIAL: "Media sosial",
  MEDIA_ELEKTRONIK: "Media elektronik",
  MEDIA_CETAK: "Media cetak",
  PENGERAS_SUARA: "Pengeras suara di ruang publik",
  LAINNYA: "Media lainnya sesuai kondisi Desa",
} as const;
export type PublicationChannel = keyof typeof PUBLICATION_CHANNELS;
export const isPublicationChannel = (v: unknown): v is PublicationChannel => typeof v === "string" && v in PUBLICATION_CHANNELS;

/** Larangan penggunaan Dana Desa (Permendesa 16/2025 Lampiran II.J), nomor sesuai urutan di lampiran. */
export const PROHIBITIONS = [
  { key: "L1", no: 1, text: "Pembayaran honorarium kepala Desa, perangkat Desa, dan/atau anggota BPD" },
  { key: "L2", no: 2, text: "Perjalanan dinas kepala Desa, perangkat Desa, dan/atau anggota BPD ke luar wilayah kabupaten/kota" },
  { key: "L3", no: 3, text: "Iuran jaminan sosial kesehatan dan/atau ketenagakerjaan bagi kepala Desa, perangkat Desa, dan/atau anggota BPD" },
  { key: "L4", no: 4, text: "Pembangunan kantor desa atau balai desa (rehabilitasi atau perbaikan ringan hanya sampai batas yang ditetapkan)" },
  { key: "L5", no: 5, text: "Bimbingan teknis bagi kepala Desa, perangkat Desa, dan/atau anggota BPD" },
  { key: "L6", no: 6, text: "Bimbingan teknis dan/atau studi banding ke luar wilayah kabupaten/kota" },
  { key: "L7", no: 7, text: "Membayar kewajiban yang harus dibayar pada tahun sebelumnya" },
  { key: "L8", no: 8, text: "Bantuan hukum bagi pejabat atau warga yang berperkara hukum melalui pengadilan untuk kepentingan pribadi" },
] as const;
export type ProhibitionKey = (typeof PROHIBITIONS)[number]["key"];
export const isProhibitionKey = (v: unknown): v is ProhibitionKey => PROHIBITIONS.some((p) => p.key === v);

export interface YearRules {
  year: number;
  /** Rujukan ringkas untuk ditampilkan */
  sources: string[];
  /** BLT Desa: batas per bulan per keluarga (sen) dan bulan maksimal sekaligus (Permendesa 16/2025 Pasal 3) */
  bltMaxMonthlyCents: bigint;
  bltMaxMonthsAtOnce: number;
  /** Operasional Pemerintah Desa: persen dari pagu reguler, dalam basis poin (Pasal 2(3); PMK Pasal 20(5)) */
  operationalCapBps: number;
  /** Pagu KDMP: persen dari pagu Dana Desa semula, basis poin (PMK Pasal 15(3)) */
  kdmpShareBps: number;
  /** Upah Padat Karya Tunai Desa: minimal persen dari biaya kegiatan (Lampiran II.F.5.a) */
  pktdWageMinPct: number;
  /** Batas rehabilitasi ringan kantor/balai desa (sen) (Lampiran II.J.4) */
  officeRehabMaxCents: bigint;
  /** Penyaluran reguler: [tahap I %, tahap II %]; Desa mandiri memakai urutan kedua (PMK Pasal 23) */
  stages: { regular: [number, number]; mandiri: [number, number] };
  /** Batas dokumen syarat tahap I diterima (bulan, tanggal) (PMK Pasal 24(4)a) */
  stage1DocsDue: { month: number; day: number };
  /** Laporan penetapan fokus ke Menteri: paling lambat berapa bulan sejak Perdes RKP Desa (Permendesa Pasal 12(5)) */
  focusReportMonths: number;
}

export const RULES: Record<number, YearRules> = {
  2026: {
    year: 2026,
    sources: ["Permendesa PDT 16/2025 (fokus penggunaan Dana Desa 2026)", "PMK 7/2026 (alokasi, penggunaan, dan penyaluran Dana Desa 2026)"],
    bltMaxMonthlyCents: 30_000_000n,
    bltMaxMonthsAtOnce: 3,
    operationalCapBps: 300,
    kdmpShareBps: 5803,
    pktdWageMinPct: 50,
    officeRehabMaxCents: 2_500_000_000n,
    stages: { regular: [40, 60], mandiri: [60, 40] },
    stage1DocsDue: { month: 6, day: 15 },
    focusReportMonths: 1,
  },
};

export interface ResolvedRules {
  rules: YearRules;
  /** false: tahun yang diminta belum punya katalog sendiri; yang dipakai milik `rules.year` dan harus dicek ulang */
  exact: boolean;
}

export function rulesFor(year: number): ResolvedRules {
  const known = Object.keys(RULES).map(Number).sort((a, b) => a - b);
  if (RULES[year]) return { rules: RULES[year]!, exact: true };
  const prior = known.filter((y) => y < year).pop();
  return { rules: RULES[prior ?? known[0]!]!, exact: false };
}
