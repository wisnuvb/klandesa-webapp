/**
 * Katalog BUM Desa: bagan akun, peran pengurus, status legalitas, dan batas. Murni (tanpa Prisma) agar aman diimpor komponen klien.
 *
 * Sumber [V] (teks resmi dibaca): Kepmendes PDTT 136/2022 Lampiran I Bab III (bagan akun 4 tingkat X.X.XX.XX, golongan 1-7),
 * Bab II A.3 (periode akuntansi 1 Januari-31 Desember), A.8 (laporan keuangan semesteran dan tahunan), Bab V (pencatatan di kantor
 * pusat dan unit usaha, akun resiprokal RK dieliminasi pada penggabungan, tata buku berpasangan, penomoran bukti No.Urut/No.Bulan/
 * Kode Unit/Tahun); PP 11/2021 Pasal 15, 17, 26, 30, 40-43, 58-60; Permendesa PDTT 3/2021 Pasal 2-10, 22.
 * Bagan akun di bawah ini adalah SALINAN SEBAGIAN dari bagan resmi (akun rinci/pos yang jarang dipakai dihilangkan). Kode dan nama
 * mengikuti teks resmi; satu-satunya penyederhanaan: akun resiprokal dibuat satu per sisi (RK Unit Usaha 1.1.99.01 dan RK Pusat 3.8.01.01).
 */

export type AccountClass =
  | "ASET"
  | "KEWAJIBAN"
  | "EKUITAS"
  | "PENDAPATAN"
  | "HPP"
  | "BEBAN"
  | "PENDAPATAN_LAIN"
  | "BEBAN_LAIN"
  | "BEBAN_PAJAK";

export interface Account {
  code: string;
  name: string;
  cls: AccountClass;
  /** Sisi saldo normal. Akun kontra (penyisihan, akumulasi penyusutan, diskon penjualan) berlawanan dengan induknya. */
  normal: "D" | "K";
}

/** [kode, nama] sesuai Kepmendes PDTT 136/2022 Lampiran I Bab III.B. */
const RAW: readonly (readonly [string, string])[] = [
  // 1 ASET
  ["1.1.01.01", "Kas Tunai"],
  ["1.1.01.02", "Kas di Bank BSI"],
  ["1.1.01.03", "Kas di Bank Mandiri"],
  ["1.1.01.04", "Kas di Bank BRI"],
  ["1.1.01.05", "Kas di Bank BPD"],
  ["1.1.01.98", "Kas Kecil (Petty Cash)"],
  ["1.1.02.01", "Deposito <= 3 bulan"],
  ["1.1.03.01", "Piutang Usaha"],
  ["1.1.03.02", "Piutang kepada Pegawai"],
  ["1.1.03.99", "Piutang Lainnya"],
  ["1.1.04.01", "Penyisihan Piutang Usaha Tak Tertagih"],
  ["1.1.05.01", "Persediaan Barang Dagangan"],
  ["1.1.05.02", "Persediaan Bahan Baku"],
  ["1.1.05.03", "Persediaan Barang Dalam Proses"],
  ["1.1.05.04", "Persediaan Barang Jadi"],
  ["1.1.06.01", "Alat Tulis Kantor (ATK)"],
  ["1.1.07.01", "Sewa Dibayar Dimuka"],
  ["1.1.07.02", "Asuransi Dibayar Dimuka"],
  ["1.1.99.01", "RK Unit Usaha"],
  ["1.2.01.01", "Deposito > 3 bulan"],
  ["1.2.01.99", "Investasi Lainnya"],
  ["1.3.01.01", "Tanah"],
  ["1.3.02.01", "Kendaraan"],
  ["1.3.03.01", "Peralatan dan Mesin"],
  ["1.3.04.01", "Meubelair"],
  ["1.3.05.01", "Gedung dan Bangunan"],
  ["1.3.06.01", "Konstruksi Dalam Pengerjaan"],
  ["1.3.07.01", "Akumulasi Penyusutan Kendaraan"],
  ["1.3.07.02", "Akumulasi Penyusutan Peralatan dan Mesin"],
  ["1.3.07.03", "Akumulasi Penyusutan Meubelair"],
  ["1.3.07.04", "Akumulasi Penyusutan Gedung dan Bangunan"],
  // 2 KEWAJIBAN
  ["2.1.01.01", "Utang Usaha"],
  ["2.1.02.01", "PPN Keluaran"],
  ["2.1.02.02", "PPh 21"],
  ["2.1.02.03", "PPh 23"],
  ["2.1.03.01", "Utang Gaji dan Tunjangan"],
  ["2.1.03.02", "Utang Gaji/Upah Karyawan"],
  ["2.1.04.01", "Utang Listrik"],
  ["2.1.05.01", "Utang kepada Pihak Ketiga Jk. Pendek"],
  ["2.1.09.99", "Utang Jangka Pendek Lainnya"],
  ["2.2.01.01", "Utang Ke Bank"],
  ["2.2.02.01", "Utang kepada Pihak Ketiga Jk. Panjang"],
  ["2.2.99.99", "Utang Jangka Panjang Lainnya"],
  // 3 EKUITAS
  ["3.1.01.01", "Penyertaan Modal Desa"],
  ["3.1.02.01", "Penyertaan Modal Masyarakat"],
  ["3.2.01.01", "Bagi Hasil Penyertaan Modal Desa"],
  ["3.2.02.01", "Bagi Hasil Penyertaan Modal Masyarakat"],
  ["3.3.01.01", "Saldo Laba Tidak Dicadangkan"],
  ["3.3.01.02", "Saldo Laba Dicadangkan untuk Pembelian Aset Tetap"],
  ["3.3.01.03", "Saldo Laba Dicadangkan untuk Pembayaran Utang Jangka Panjang"],
  ["3.4.01.01", "Modal Donasi/Sumbangan"],
  ["3.8.01.01", "RK Pusat"],
  // 4 PENDAPATAN USAHA
  ["4.1.01.01", "Pendapatan Tiket"],
  ["4.1.01.02", "Pendapatan Wahana"],
  ["4.1.01.03", "Pendapatan Paket Wisata"],
  ["4.1.02.01", "Pendapatan Pengelolaan Air Bersih"],
  ["4.1.03.01", "Pendapatan Pengelolaan Sampah"],
  ["4.1.04.01", "Pendapatan Sewa Tempat Outbound"],
  ["4.1.04.02", "Pendapatan Sewa Tempat untuk Toko/Kios"],
  ["4.1.04.03", "Pendapatan Sewa Gedung"],
  ["4.1.04.04", "Pendapatan Sewa Mobil"],
  ["4.1.04.05", "Pendapatan Sewa Peralatan Gedung"],
  ["4.1.04.99", "Pendapatan Sewa Lainnya"],
  ["4.1.05.01", "Pendapatan Jasa Pembayaran Listrik"],
  ["4.1.05.99", "Pendapatan Jasa Pelayanan lainnya"],
  ["4.1.06.01", "Pendapatan Transportasi"],
  ["4.1.07.01", "Pendapatan Parkir Mobil"],
  ["4.1.07.02", "Pendapatan Parkir Motor"],
  ["4.1.08.01", "Pendapatan Simpan Pinjam"],
  ["4.1.09.01", "Pendapatan Pelatihan"],
  ["4.1.10.01", "Pendapatan Homestay"],
  ["4.1.11.01", "Pendapatan Komisi"],
  ["4.2.01.01", "Pendapatan Penjualan Makanan/Minuman"],
  ["4.2.01.02", "Pendapatan Penjualan Pakaian/Kaos/Jaket"],
  ["4.2.01.03", "Pendapatan Penjualan Hasil Kerajinan/Suvenir"],
  ["4.2.01.04", "Pendapatan Penjualan Buku"],
  ["4.2.01.05", "Pendapatan Penjualan Biji Kopi"],
  ["4.2.01.06", "Pendapatan Penjualan Bensin"],
  ["4.2.01.99", "Diskon Penjualan Barang Dagangan"],
  ["4.3.01.01", "Pendapatan Katering"],
  ["4.3.01.02", "Pendapatan Restoran"],
  ["4.3.01.03", "Pendapatan Kopi"],
  ["4.3.01.04", "Diskon Penjualan Barang Jadi"],
  // 5 HARGA POKOK
  ["5.1.01.01", "Harga Pokok Penjualan Barang Dagangan"],
  ["5.2.01.01", "Harga Pokok Penjualan Barang Jadi"],
  ["5.3.01.01", "Harga Pokok Produksi"],
  // 6 BEBAN USAHA
  ["6.1.01.01", "Beban Gaji dan Tunjangan Bag. Adum"],
  ["6.1.01.02", "Beban Honor Lembur Bag. Adum"],
  ["6.1.01.03", "Beban Honor Narasumber"],
  ["6.1.01.04", "Beban Insentif (Bonus) Bag. Adum"],
  ["6.1.01.07", "Beban Penguatan SDM"],
  ["6.1.01.99", "Beban Pegawai Bag. Adum Lainnya"],
  ["6.1.02.01", "Beban Alat Tulis Kantor (ATK)"],
  ["6.1.02.02", "Beban Foto Copy"],
  ["6.1.02.03", "Beban Konsumsi Rapat"],
  ["6.1.02.04", "Beban Cetak dan Dekorasi"],
  ["6.1.02.99", "Beban Perlengkapan Lainnya"],
  ["6.1.03.01", "Beban Pemeliharaan dan Perbaikan"],
  ["6.1.04.01", "Beban Listrik"],
  ["6.1.04.02", "Beban Telepon/Internet"],
  ["6.1.04.99", "Beban Utilitas Lainnya"],
  ["6.1.05.01", "Beban Sewa"],
  ["6.1.05.02", "Beban Asuransi"],
  ["6.1.06.01", "Beban Kebersihan"],
  ["6.1.06.02", "Beban Keamanan"],
  ["6.1.07.01", "Beban Penyisihan Piutang Tak Tertagih"],
  ["6.1.07.02", "Beban Penyusutan Kendaraan"],
  ["6.1.07.03", "Beban Penyusutan Peralatan dan Mesin"],
  ["6.1.07.04", "Beban Penyusutan Meubelair"],
  ["6.1.07.05", "Beban Penyusutan Gedung dan Bangunan"],
  ["6.1.99.01", "Beban Parkir"],
  ["6.1.99.02", "Beban Audit"],
  ["6.1.99.03", "Beban Perjalanan Dinas"],
  ["6.1.99.04", "Beban Transportasi"],
  ["6.1.99.05", "Beban Jamuan Tamu"],
  ["6.1.99.99", "Beban Administrasi dan Umum Lainnya"],
  ["6.2.01.01", "Beban Gaji/Upah Bag. Operasional"],
  ["6.2.01.02", "Beban Uang Makan Bag. Operasional"],
  ["6.2.02.01", "Beban Pemeliharaan Wahana"],
  ["6.2.02.02", "Beban Perbaikan dan Renovasi"],
  ["6.2.03.01", "Beban Tim SAR"],
  ["6.2.03.02", "Beban P3K"],
  ["6.2.99.01", "Beban Komunikasi"],
  ["6.2.99.02", "Beban Sewa Lokasi"],
  ["6.2.99.03", "Beban Pakan Ikan"],
  ["6.2.99.99", "Beban Operasional Lainnya"],
  ["6.3.01.01", "Beban Gaji/Upah Bag. Pemasaran"],
  ["6.3.01.02", "Beban Insentif (Bonus) Bag. Pemasaran"],
  ["6.3.02.01", "Beban Iklan"],
  ["6.3.02.03", "Beban Dana Sosial"],
  ["6.3.99.99", "Beban Pemasaran Lainnya"],
  // 7 PENDAPATAN DAN BEBAN LAIN-LAIN
  ["7.1.01.01", "Pendapatan Bunga Bank"],
  ["7.1.02.01", "Pendapatan Dividen"],
  ["7.1.03.01", "Pendapatan Denda"],
  ["7.1.04.01", "Pendapatan Iklan"],
  ["7.1.05.01", "Keuntungan Penjualan Aset Tetap"],
  ["7.1.99.99", "Pendapatan Lain-lain lainnya"],
  ["7.2.01.01", "Beban Administrasi Bank"],
  ["7.2.02.01", "Beban Bunga"],
  ["7.2.03.01", "Beban Denda"],
  ["7.2.04.01", "Kerugian Penjualan Aset Tetap"],
  ["7.2.99.99", "Beban Lain-lain lainnya"],
  ["7.3.01.08", "Beban PPh 25"],
  ["7.3.01.10", "Beban PPh Final"],
  ["7.3.01.99", "Beban Pajak Lainnya"],
];

/** Akun kontra: saldo normalnya berlawanan dengan golongannya. */
const CONTRA_KREDIT = (c: string) => c.startsWith("1.1.04.") || c.startsWith("1.3.07.");
const CONTRA_DEBIT = (c: string) => c === "4.2.01.99" || c === "4.3.01.04" || c.startsWith("3.2.") || c === "3.8.01.01";

function classOf(code: string): AccountClass {
  const g = code[0];
  if (g === "1") return "ASET";
  if (g === "2") return "KEWAJIBAN";
  if (g === "3") return "EKUITAS";
  if (g === "4") return "PENDAPATAN";
  if (g === "5") return "HPP";
  if (g === "6") return "BEBAN";
  if (code.startsWith("7.1.")) return "PENDAPATAN_LAIN";
  if (code.startsWith("7.3.")) return "BEBAN_PAJAK";
  return "BEBAN_LAIN";
}

function normalOf(code: string, cls: AccountClass): "D" | "K" {
  if (CONTRA_KREDIT(code)) return "K";
  if (CONTRA_DEBIT(code)) return "D";
  return cls === "ASET" || cls === "HPP" || cls === "BEBAN" || cls === "BEBAN_LAIN" || cls === "BEBAN_PAJAK" ? "D" : "K";
}

export const ACCOUNTS: readonly Account[] = RAW.map(([code, name]) => {
  const cls = classOf(code);
  return { code, name, cls, normal: normalOf(code, cls) };
});

const BY_CODE = new Map(ACCOUNTS.map((a) => [a.code, a]));
export const accountOf = (code: string): Account | null => BY_CODE.get(code) ?? null;
export const accountName = (code: string): string => BY_CODE.get(code)?.name ?? code;
export const isAccountCode = (code: unknown): code is string => typeof code === "string" && BY_CODE.has(code);

/** Akun kas dan bank (1.1.01.xx). */
export const CASH_ACCOUNTS: readonly Account[] = ACCOUNTS.filter((a) => a.code.startsWith("1.1.01."));
export const isCashAccount = (code: unknown): code is string => typeof code === "string" && BY_CODE.has(code) && code.startsWith("1.1.01.");
export const DEFAULT_CASH_ACCOUNT = "1.1.01.01";
/** Akun lawan bawaan bila transaksi kas tidak memilih akun. */
export const DEFAULT_INCOME_ACCOUNT = "4.1.05.99";
export const DEFAULT_EXPENSE_ACCOUNT = "6.2.99.99";

/** Akun resiprokal antara Kantor Pusat dan unit usaha; dieliminasi pada penggabungan (Kepmendes 136/2022 Bab V.B.2). */
export const RK_UNIT_ACCOUNT = "1.1.99.01";
export const RK_PUSAT_ACCOUNT = "3.8.01.01";
export const isReciprocal = (code: string): boolean => code === RK_UNIT_ACCOUNT || code === RK_PUSAT_ACCOUNT;

/** Akun yang dipakai arus APB Desa. */
export const EQUITY_VILLAGE_CAPITAL = "3.1.01.01"; // Penyertaan Modal Desa
export const EQUITY_VILLAGE_PROFIT_SHARE = "3.2.01.01"; // Bagi Hasil Penyertaan Modal Desa (pengambilan oleh pemilik)
/**
 * Akun yang hanya boleh disentuh arus APB Desa (createFlow): Penyertaan Modal Desa dan Bagi Hasil Penyertaan Modal Desa.
 * Jurnal manual dan transaksi kas ditolak memakainya. Satu-satunya pengecualian: jurnal pembukaan berlabel SALDO_AWAL boleh
 * memakai 3.1.01.01 untuk modal Desa yang sudah ada sebelum pencatatan di aplikasi; rekonsiliasi laporan menampilkannya terpisah.
 */
export const FLOW_ONLY_ACCOUNTS: readonly string[] = [EQUITY_VILLAGE_CAPITAL, EQUITY_VILLAGE_PROFIT_SHARE];
export const OPENING_ALLOWED_ACCOUNTS: readonly string[] = [EQUITY_VILLAGE_CAPITAL];
/** Jenis Musyawarah Desa yang sah sebagai dasar arus APB Desa (katalog lib/musdes/catalog.ts). */
export const FLOW_MEETING_KIND = "MUSDES_BUMDES";

/** Kode rekening APB Desa (lib/apbdes/codes.ts): pengeluaran pembiayaan "Penyertaan Modal Desa" dan pendapatan "Bagi Hasil BUMDes". */
export const APBDES_CAPITAL_ACCOUNT = "6.2.2.01";
export const APBDES_PROFIT_SHARE_ACCOUNT = "4.1.1.01";

export const ACCOUNT_CLASS_LABEL: Record<AccountClass, string> = {
  ASET: "Aset",
  KEWAJIBAN: "Kewajiban",
  EKUITAS: "Ekuitas",
  PENDAPATAN: "Pendapatan usaha",
  HPP: "Harga pokok",
  BEBAN: "Beban usaha",
  PENDAPATAN_LAIN: "Pendapatan lain-lain",
  BEBAN_LAIN: "Beban lain-lain",
  BEBAN_PAJAK: "Beban pajak",
};
export const isNominal = (cls: AccountClass): boolean => cls !== "ASET" && cls !== "KEWAJIBAN" && cls !== "EKUITAS";

// ---- Jurnal

export const JOURNAL_SOURCE = { MANUAL: "Jurnal manual", SALDO_AWAL: "Saldo awal (jurnal pembukaan)", KAS: "Dari transaksi kas", MODAL: "Penyertaan modal Desa", BAGI_HASIL: "Bagi hasil ke Desa" } as const;
export type JournalSource = keyof typeof JOURNAL_SOURCE;

export const STATUS = { AKTIF: "Aktif", DIBATALKAN: "Dibatalkan" } as const;
export type RecordStatus = keyof typeof STATUS;

// ---- Periode

/** Periode laporan: semester I (Januari-Juni), semester II (Juli-Desember), atau tahunan (PP 11/2021 Pasal 58 ayat 2). */
export const PERIOD_KIND = { S1: "Semester I (Januari-Juni)", S2: "Semester II (Juli-Desember)", TAHUN: "Tahunan (Januari-Desember)" } as const;
export type PeriodKind = keyof typeof PERIOD_KIND;
export const isPeriodKind = (v: unknown): v is PeriodKind => v === "S1" || v === "S2" || v === "TAHUN";

// ---- Legalitas dan pengurus

export const LEGAL_STATUS = {
  BELUM_DAFTAR: "Belum didaftarkan",
  PROSES: "Dalam proses pendaftaran",
  BADAN_HUKUM: "Berbadan hukum (sertifikat pendaftaran terbit)",
} as const;
export type LegalStatus = keyof typeof LEGAL_STATUS;
export const isLegalStatus = (v: unknown): v is LegalStatus => typeof v === "string" && Object.hasOwn(LEGAL_STATUS, v);

/** Peran pengurus: PP 11/2021 Pasal 15 (organ), Pasal 17 huruf e-g (diangkat Musyawarah Desa), Pasal 24-26 dan 28-30 (masa jabatan 5 tahun). */
export const OFFICER_ROLE = {
  PENASIHAT: "Penasihat",
  PELAKSANA_OPERASIONAL: "Pelaksana operasional (direktur)",
  SEKRETARIS: "Sekretaris",
  BENDAHARA: "Bendahara",
  PENGAWAS: "Pengawas",
  KEPALA_UNIT: "Kepala unit usaha",
} as const;
export type OfficerRole = keyof typeof OFFICER_ROLE;
export const isOfficerRole = (v: unknown): v is OfficerRole => typeof v === "string" && Object.hasOwn(OFFICER_ROLE, v);
/** PP 11/2021 Pasal 26 (pelaksana operasional) dan Pasal 30 (pengawas): memegang jabatan selama 5 tahun. */
export const TERM_YEARS = 5;

export const RANKING_LEVEL = { A: "A (maju)", B: "B (berkembang)", C: "C (pemula)", D: "D (perintis)" } as const;
export const isRankingLevel = (v: unknown): v is keyof typeof RANKING_LEVEL => typeof v === "string" && Object.hasOwn(RANKING_LEVEL, v);

/** Permendesa PDTT 3/2021 Pasal 9 ayat 4: pendaftaran paling lama 20 hari kerja sejak Peraturan Desa pendirian ditetapkan. */
export const REGISTRATION_WORKDAYS = 20;
/** PP 11/2021 Pasal 43 ayat 1: penyertaan modal disalurkan paling lambat 3 bulan sejak keputusan Musyawarah Desa. */
export const CAPITAL_DISBURSE_MONTHS = 3;
/** PP 11/2021 Pasal 19 ayat 3: Musyawarah Desa tahunan paling lama 6 bulan setelah tahun buku lampau. */
export const ANNUAL_MUSDES_MONTHS = 6;

// ---- Arus APB Desa

export const FLOW_KIND = {
  PENYERTAAN_MODAL: { label: "Penyertaan modal Desa", basis: "PP 11/2021 Pasal 40 ayat 3, Pasal 41 ayat 4, Pasal 43" },
  BAGI_HASIL: { label: "Bagi hasil usaha ke Desa", basis: "PP 11/2021 Pasal 17 huruf l-m-p, Pasal 59 ayat 2, Pasal 60 ayat 2" },
} as const;
export type FlowKind = keyof typeof FLOW_KIND;
export const isFlowKind = (v: unknown): v is FlowKind => v === "PENYERTAAN_MODAL" || v === "BAGI_HASIL";

export const LIMITS = {
  journalsPerYear: 20_000,
  linesPerJournal: 40,
  officers: 60,
  flows: 600,
  resolutions: 300,
  reasonMin: 5,
} as const;
