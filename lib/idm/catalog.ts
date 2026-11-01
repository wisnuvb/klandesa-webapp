/**
 * Indeks Desa Membangun (IDM): dimensi, bidang impor, dan batas.
 *
 * Yang DIVERIFIKASI dari sumber publik: berkas IDM per desa yang dipublikasikan pemerintah daerah (contoh: portal data
 * Sumbawa Barat, "IDM per 31 Desember 2025") berkolom No, Kode Kabupaten, Nama Kabupaten, Kode Kecamatan, Nama Kecamatan,
 * Kode Desa, Nama Desa/Kelurahan, IKS, IKE, IKL, NILAI IDM, STATUS IDM; berkas tahunan lain memakai akhiran tahun ("IKS 2024").
 * Yang TIDAK diverifikasi: format berkas "rumusan" per indikator dari idm.kemendesa.go.id (server resmi tak dapat dijangkau dari
 * lingkungan pengembangan: sertifikat kedaluwarsa), definisi resmi indikator, skala skor, dan ambang status. Karena itu
 * impor ini berkolom-dapat-dipetakan, skor disimpan apa adanya, status dibaca dari berkas (tidak dihitung).
 */

export const DIMENSIONS = {
  IKS: "Ketahanan Sosial (IKS)",
  IKE: "Ketahanan Ekonomi (IKE)",
  IKL: "Ketahanan Lingkungan/Ekologi (IKL)",
  LAIN: "Lainnya/belum dikelompokkan",
} as const;
export type Dimension = keyof typeof DIMENSIONS;
export const isDimension = (v: unknown): v is Dimension => typeof v === "string" && Object.hasOwn(DIMENSIONS, v);

export const LAYOUTS = {
  SUMMARY: "Satu baris per desa (skor IKS, IKE, IKL, IDM, dan status)",
  INDICATORS: "Satu baris per indikator (skor tiap indikator untuk satu desa)",
} as const;
export type Layout = keyof typeof LAYOUTS;
export const isLayout = (v: unknown): v is Layout => typeof v === "string" && Object.hasOwn(LAYOUTS, v);

export interface FieldDef {
  id: string;
  label: string;
  required?: boolean;
  /** nama kolom yang dikenali (huruf kecil, tanpa tanda baca) */
  aliases: string[];
  /** pola nama kolom yang dikenali (setelah dinormalkan) */
  pattern?: RegExp;
}

export const SUMMARY_FIELDS: FieldDef[] = [
  { id: "kodeDesa", label: "Kode desa", aliases: ["kode desa", "kode desa kelurahan", "kd desa", "kodedesa", "id desa", "kode wilayah"] },
  { id: "namaDesa", label: "Nama desa", aliases: ["nama desa", "nama desa kelurahan", "desa", "desa kelurahan", "nama desa atau kelurahan"] },
  { id: "kecamatan", label: "Kecamatan (membantu mencocokkan)", aliases: ["nama kecamatan", "kecamatan"] },
  { id: "tahun", label: "Tahun (bila ada kolomnya)", aliases: ["tahun", "periode", "year"] },
  { id: "iks", label: "IKS (Ketahanan Sosial)", aliases: ["iks", "indeks ketahanan sosial", "skor iks", "nilai iks", "ketahanan sosial"], pattern: /^iks \d{4}$/ },
  { id: "ike", label: "IKE (Ketahanan Ekonomi)", aliases: ["ike", "indeks ketahanan ekonomi", "skor ike", "nilai ike", "ketahanan ekonomi"], pattern: /^ike \d{4}$/ },
  { id: "ikl", label: "IKL (Ketahanan Lingkungan)", aliases: ["ikl", "indeks ketahanan lingkungan", "indeks ketahanan ekologi", "skor ikl", "nilai ikl", "ketahanan lingkungan", "ketahanan ekologi"], pattern: /^ikl \d{4}$/ },
  { id: "idm", label: "Nilai IDM", aliases: ["nilai idm", "skor idm", "idm", "indeks desa membangun", "nilai indeks"], pattern: /^(nilai |skor )?idm \d{4}$/ },
  { id: "status", label: "Status IDM", aliases: ["status idm", "status", "status desa", "klasifikasi"], pattern: /^status idm \d{4}$/ },
];

export const INDICATOR_FIELDS: FieldDef[] = [
  { id: "dimensi", label: "Dimensi/aspek", aliases: ["dimensi", "aspek", "kategori", "jenis indeks", "indeks", "dimensi indeks"] },
  { id: "kode", label: "Nomor/kode indikator", aliases: ["no", "kode", "nomor", "kode indikator", "no indikator", "nomor indikator"] },
  { id: "indikator", label: "Nama indikator", required: true, aliases: ["indikator", "nama indikator", "uraian", "uraian indikator", "variabel"] },
  { id: "skor", label: "Skor indikator", required: true, aliases: ["skor", "nilai", "skor indikator", "nilai indikator", "skor desa"] },
  { id: "skorMaks", label: "Skor maksimal (bila ada)", aliases: ["skor maksimal", "skor maks", "nilai maksimal", "maks", "skor tertinggi", "skor maksimum"] },
  { id: "keterangan", label: "Keterangan", aliases: ["keterangan", "catatan"] },
  { id: "kegiatan", label: "Rekomendasi kegiatan (bila ada)", aliases: ["kegiatan", "rekomendasi", "rekomendasi kegiatan", "yang dapat dilakukan", "kegiatan yang dapat dilakukan", "upaya"] },
];

export const LIMITS = { indicatorsPerYear: 300, maxFileMb: 20, maxRows: 100_000, maxScore: 99_999 } as const;

export const FOCUS_REF = "Permendesa PDT 16/2025 Pasal 8 ayat (2)-(3): fokus penggunaan Dana Desa diutamakan berdasarkan rekomendasi Indeks Desa dan dibahas serta disepakati dalam Musyawarah Desa Penyusunan RKP Desa [dibaca dari teks resmi]";

export const SOURCES = [
  { ref: "Permendesa PDT 16/2025 Pasal 8", note: "Fokus Dana Desa diutamakan berdasarkan rekomendasi Indeks Desa; dibahas di Musdes Penyusunan RKP Desa", status: "V" },
  { ref: "Berkas IDM per desa dari portal data pemerintah daerah (contoh Sumbawa Barat 2025)", note: "Kolom IKS, IKE, IKL, NILAI IDM, STATUS IDM per desa; skala angka berbeda antar sumber (ada yang berskala 0-1, ada yang berupa jumlah poin)", status: "V" },
  { ref: "Berkas rumusan indikator dari idm.kemendesa.go.id", note: "Format tidak dapat diverifikasi (server resmi tak terjangkau, sertifikat kedaluwarsa); impor per indikator dibuat dapat dipetakan", status: "R" },
  { ref: "Permendesa PDTT 2/2016 (IDM): definisi indikator dan ambang status", note: "Tidak dibaca; status dan skala skor tidak dihitung ulang, hanya diambil dari berkas", status: "R" },
] as const;
