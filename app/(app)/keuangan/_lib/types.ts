export type ApbdesData = {
  tahun: number;
  totalPendapatan: number;
  totalBelanja: number;
  realisasiPendapatan: number;
  realisasiBelanja: number;
  budgetPendapatan?: number;
  budgetBelanja?: number;
};

export type PendapatanItem = {
  kategori: string;
  anggaran: number;
  realisasi: number;
  persentase: number;
  subKategori: Array<{ nama: string; anggaran: number; realisasi: number }>;
};

export type BelanjaSubItem = {
  nama: string;
  anggaran: number;
  realisasi: number;
  persentase: number;
};

export type BelanjaItem = {
  bidang: string;
  anggaran: number;
  realisasi: number;
  persentase: number;
  color?: string;
  subItems: BelanjaSubItem[];
};

export type TransaksiKasItem = {
  id: number;
  tanggal: string;
  kode: string;
  uraian: string;
  jenis: "masuk" | "keluar";
  jumlah: number;
  saldo: number;
  status: string;
};

export type SPPItem = {
  id: number;
  nomor: string;
  tanggal: string;
  keperluan: string;
  bidang: string;
  jumlah: number;
  status: string;
  pengaju: string;
};

export type TrendItem = { bulan: string; pendapatan: number; belanja: number };

export type FinanceResponse = {
  apbdes: ApbdesData;
  pendapatan: PendapatanItem[];
  belanja: BelanjaItem[];
  transaksi: TransaksiKasItem[];
  spp: SPPItem[];
  trend: TrendItem[];
};

export const KEUANGAN_TABS = [
  "overview",
  "pendapatan",
  "belanja",
  "kas",
  "spp",
] as const;

export type KeuanganTab = (typeof KEUANGAN_TABS)[number];

export type PendapatanFormState = {
  tanggal: string;
  kategori: string;
  subKategori: string;
  uraian: string;
  jumlah: string;
  nomorBukti: string;
};

export type BelanjaFormState = {
  tanggal: string;
  bidang: string;
  subKegiatan: string;
  keterangan: string;
  jumlah: string;
  nomorBukti: string;
};

export type TransaksiFormState = {
  id: number | null;
  tanggal: string;
  jenis: "masuk" | "keluar";
  kategori: string;
  uraian: string;
  jumlah: string;
  nomorBukti: string;
};

export type SppFormState = {
  id: number | null;
  nomorSPP: string;
  tanggal: string;
  kegiatan: string;
  subKegiatan: string;
  uraian: string;
  jumlah: string;
  kodeRekening: string;
  keterangan: string;
};
