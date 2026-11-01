/** Bentuk respons GET /api/statistics, dipakai API, halaman statistik, ekspor, dan halaman cetak. */

export interface PopulationChangeMonth {
  /** "yyyy-mm" */
  key: string;
  /** Singkatan bulan, mis. "Jun" */
  bulan: string;
  lahir: number;
  datang: number;
  meninggal: number;
  pindah: number;
  /** lahir + datang */
  bertambah: number;
  /** meninggal + pindah */
  berkurang: number;
  selisih: number;
}

export interface PopulationChange {
  /** Selisih penduduk pada bulan berjalan menurut mutasi yang sudah diterapkan. */
  bulanIni: number;
  /** Selisih bulan ini terhadap jumlah penduduk awal bulan, dalam persen. */
  persenBulanIni: number;
  /** Enam bulan terakhir, terlama lebih dulu. */
  perBulan: PopulationChangeMonth[];
}

export interface StatisticsData {
  summary: {
    totalPenduduk: number;
    lakiLaki: number;
    perempuan: number;
  };
  jenisKelamin: Array<{ name: string; value: number; percentage: number }>;
  usia: Array<{ range: string; lakilaki: number; perempuan: number; total: number }>;
  pendidikan: Array<{ tingkat: string; jumlah: number }>;
  pekerjaan: Array<{ pekerjaan: string; jumlah: number }>;
  perkawinan: Array<{ status: string; jumlah: number }>;
  agama: Array<{ agama: string; jumlah: number }>;
  golonganDarah: Array<{ golongan: string; jumlah: number }>;
  wilayah: Array<{ wilayah: string; jumlah: number }>;
  kesehatan: Array<{ kategori: string; jumlah: number }>;
  /** Hanya untuk desa dengan Kependudukan v2 (mutasi tercatat); null bila belum aktif. */
  perubahanPenduduk: PopulationChange | null;
  /** Waktu data dihitung (ISO). */
  dihitungPada: string;
}
