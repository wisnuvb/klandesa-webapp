const YEAR_OPTION_SPAN = 5;

/** Tahun berjalan + 4 tahun sebelumnya; `extra` dipakai agar tahun terpilih selalu ada di daftar. */
export function buildYearOptions(extra?: string): string[] {
  const current = new Date().getFullYear();
  const years = new Set<string>(
    Array.from({ length: YEAR_OPTION_SPAN }, (_, i) => String(current - i)),
  );
  if (extra && /^\d{4}$/.test(extra)) years.add(extra);
  return [...years].sort((a, b) => Number(b) - Number(a));
}

export {
  subKategoriOptions,
  subKegiatanOptions,
} from "@/lib/finance/taxonomy";

export const kategoriTransaksiMasuk = [
  "Penerimaan Dana Desa",
  "Penerimaan ADD",
  "Penerimaan Bagi Hasil Pajak",
  "Hasil Usaha Desa",
  "Hasil Aset Desa",
  "Swadaya Masyarakat",
  "Hibah dan Sumbangan",
  "Lain-lain Pendapatan",
];

export const kategoriTransaksiKeluar = [
  "Belanja Pegawai",
  "Belanja Barang dan Jasa",
  "Belanja Modal",
  "Belanja Tak Terduga",
  "Honorarium",
  "Operasional Pemerintahan",
  "Pembangunan",
  "Pemberdayaan Masyarakat",
];

