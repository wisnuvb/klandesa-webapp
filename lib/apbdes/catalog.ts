/**
 * Istilah, batas, dan aturan kode untuk keuangan desa menurut Permendagri 20/2018. Murni (tanpa Prisma), aman dipakai klien.
 * Jumlah uang selalu dalam sen (BigInt) di server; di sini hanya aturan bentuk dan kode.
 */
import { AKUN, BIDANG, KEGIATAN, SUB_BIDANG, type CodeEntry } from "./codes";

export const LIMITS = { linesPerDocument: 3000, entriesPerYear: 20000 } as const;

export const DOCUMENT_STATUS = ["DRAFT", "DITETAPKAN"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUS)[number];

export const ENTRY_TYPES = {
  PENERIMAAN: "Penerimaan",
  PENGELUARAN: "Pengeluaran",
  SETOR_PAJAK: "Setoran pajak",
  TARIK_BANK: "Tarik tunai dari bank",
  SETOR_BANK: "Setor tunai ke bank",
} as const;
export type EntryType = keyof typeof ENTRY_TYPES;
/** Tipe di buku kas termasuk yang dibuat sistem: pengembalian sisa panjar (lewat modul panjar, bukan formulir umum). */
export type LedgerEntryType = EntryType | "PANJAR_KEMBALI";
export const isEntryType = (v: unknown): v is EntryType => typeof v === "string" && v in ENTRY_TYPES;

export const CHANNELS = { TUNAI: "Kas tunai", BANK: "Rekening kas desa (bank)" } as const;
export type Channel = keyof typeof CHANNELS;
export const isChannel = (v: unknown): v is Channel => v === "TUNAI" || v === "BANK";

/** Sumber dana: istilah ringkas milik aplikasi (peraturan hanya meminta kolom "Sumber Dana"), bukan kode resmi. */
export const FUND_SOURCES = {
  DD: "Dana Desa",
  ADD: "Alokasi Dana Desa",
  PADES: "Pendapatan Asli Desa",
  BHPRD: "Bagi hasil pajak dan retribusi daerah",
  BKP: "Bantuan keuangan provinsi",
  BKK: "Bantuan keuangan kabupaten/kota",
  LAIN: "Lain-lain",
} as const;
export type FundSource = keyof typeof FUND_SOURCES;
export const isFundSource = (v: unknown): v is FundSource => typeof v === "string" && v in FUND_SOURCES;

/** Jenis pajak yang lazim dipotong bendahara. Tarif tidak ditanam: petugas mengisi jumlahnya sesuai ketentuan perpajakan yang berlaku. */
export const TAX_KINDS = ["PPN", "PPh 21", "PPh 22", "PPh 23", "Pajak lainnya"] as const;
export const isTaxKind = (v: unknown): v is (typeof TAX_KINDS)[number] => typeof v === "string" && (TAX_KINDS as readonly string[]).includes(v);

export const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"] as const;

/** Kode bunga bank (4.3.6.01): pemasukan ini tampil di kolom "Bunga Bank" Buku Bank. */
export const BANK_INTEREST_CODE = "4.3.6.01";
/** Kode SiLPA tahun sebelumnya (6.1.1.01): dipakai mencatat saldo kas awal tahun. */
export const SILPA_CODE = "6.1.1.01";

const byCode = (list: readonly CodeEntry[]) => new Map(list.map((e) => [e.code, e.name]));
const KEGIATAN_MAP = byCode(KEGIATAN);
const AKUN_MAP = byCode(AKUN);
const SUB_MAP = byCode(SUB_BIDANG);
const BIDANG_MAP = byCode(BIDANG);

/** Kode "lain-lain" 90-99 dinyatakan satu baris di peraturan; di sini kodenya dinormalkan ke baris tersebut. */
function rangeKey(code: string): string | null {
  const m = /^(.*)\.(9\d)$/.exec(code);
  return m ? `${m[1]}.90-99` : null;
}

export function kegiatanName(code: string): string | null {
  return KEGIATAN_MAP.get(code) ?? (rangeKey(code) ? (KEGIATAN_MAP.get(rangeKey(code)!) ?? null) : null);
}
export function accountName(code: string): string | null {
  return AKUN_MAP.get(code) ?? (rangeKey(code) ? (AKUN_MAP.get(rangeKey(code)!) ?? null) : null);
}
export const subBidangName = (code: string): string | null => SUB_MAP.get(code) ?? null;
export const bidangName = (code: string): string | null => BIDANG_MAP.get(code) ?? null;

/** Kode kegiatan sah: 1.1.01 atau lain-lain 1.1.90 sampai 1.1.99; bidang 5 memakai 5.x.00. */
export const isKegiatanCode = (code: string): boolean => /^[1-5]\.\d\.\d{2}$/.test(code) && kegiatanName(code) !== null;

/** Rekening yang bisa dianggarkan/dicatat: tingkat objek (4 bagian), mis. 5.2.1.01. */
export const isLeafAccountCode = (code: string): boolean => /^[4-6]\.\d\.\d\.\d{2}$/.test(code) && accountName(code) !== null;

export type AccountKind = "PENDAPATAN" | "BELANJA" | "PEMBIAYAAN";
export function accountKind(code: string): AccountKind | null {
  return code.startsWith("4.") ? "PENDAPATAN" : code.startsWith("5.") ? "BELANJA" : code.startsWith("6.") ? "PEMBIAYAAN" : null;
}
/** Penerimaan pembiayaan (6.1) atau pengeluaran pembiayaan (6.2). */
export const isFinancingReceipt = (code: string): boolean => code.startsWith("6.1.");

/** Daftar rekening objek untuk pilihan di formulir, per jenis akun. */
export function leafAccounts(kind: AccountKind): CodeEntry[] {
  const first = kind === "PENDAPATAN" ? "4." : kind === "BELANJA" ? "5." : "6.";
  return AKUN.filter((a) => a.code.startsWith(first) && /^\d\.\d\.\d\.(\d{2}|90-99)$/.test(a.code));
}

/** Kegiatan yang boleh dipilih. Kegiatan 90-99 ditambah kabupaten/kota; nama kegiatan "lain-lain" dapat disesuaikan di uraian. */
export function activityOptions(): CodeEntry[] {
  return KEGIATAN.map((k) => ({ code: k.code.replace("90-99", "90"), name: k.name }));
}

/** Pecah kode menjadi induk-induknya untuk pengelompokan laporan: "5.2.1.01" → ["5","5.2","5.2.1","5.2.1.01"]. */
export function accountChain(code: string): string[] {
  const parts = code.split(".");
  return parts.map((_, i) => parts.slice(0, i + 1).join("."));
}
export function activityChain(code: string): string[] {
  const parts = code.split(".");
  return parts.map((_, i) => parts.slice(0, i + 1).join("."));
}

/**
 * Tenggat laporan dari Permendagri 20/2018 (tanggal tidak dihitung bila peraturan hanya menyebut "minggu kedua").
 * Pasal 67 ayat 1: BKU yang ditutup dilaporkan ke Sekretaris Desa paling lambat tanggal 10 bulan berikutnya.
 */
export const DEADLINES = {
  bkuToSecretaryDay: 10,
  semesterOneLabel: "minggu kedua bulan Juli tahun berjalan (Pasal 68)",
  accountabilityLabel: "paling lambat 3 bulan setelah akhir tahun anggaran, yaitu 31 Maret (Pasal 70)",
} as const;

export const SOURCE_NOTE = "Permendagri 20/2018 tentang Pengelolaan Keuangan Desa";

export const PLAN_STATUS = { DRAFT: "Draf", DIVERIFIKASI: "Diverifikasi Sekretaris Desa", DISETUJUI: "Disetujui Kepala Desa" } as const;
export type PlanStatus = keyof typeof PLAN_STATUS;

export const SPP_STATUS = { DIAJUKAN: "Diajukan", DIVERIFIKASI: "Diverifikasi Sekretaris Desa", DISETUJUI: "Disetujui Kepala Desa", DIBAYAR: "Sudah dibayar", DITOLAK: "Ditolak" } as const;
export type SppStatus = keyof typeof SPP_STATUS;
export const MODES = { SWAKELOLA: "Swakelola", PENYEDIA: "Penyedia barang/jasa" } as const;
export type Mode = keyof typeof MODES;
