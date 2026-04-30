export const YEAR_OPTIONS = ["2025", "2024", "2023", "2022"] as const;

export const subKategoriOptions: Record<string, string[]> = {
  PADes: [
    "Hasil Usaha Desa",
    "Hasil Aset Desa",
    "Swadaya dan Partisipasi",
    "Lain-lain PADes",
  ],
  Transfer: [
    "Dana Desa",
    "Alokasi Dana Desa (ADD)",
    "Bagi Hasil Pajak & Retribusi",
  ],
  "Lain-lain": ["Hibah dan Sumbangan", "Lain-lain Pendapatan Desa"],
};

export const subKegiatanOptions: Record<string, string[]> = {
  "Penyelenggaraan Pemerintahan Desa": [
    "Penyelenggaraan Belanja Siltap, Tunjangan dan Operasional Pemerintah Desa",
    "Sarana dan Prasarana Pemerintah Desa",
    "Administrasi Pemerintahan Desa",
    "Tunjangan BPD",
    "Operasional BPD",
  ],
  "Pelaksanaan Pembangunan Desa": [
    "Pembangunan Jalan Desa",
    "Pembangunan Jembatan",
    "Pembangunan Irigasi",
    "Pembangunan Air Bersih",
    "Pembangunan Sanitasi",
    "Pembangunan Fasilitas Umum",
  ],
  "Pembinaan Kemasyarakatan": [
    "Kegiatan Pembinaan Ketentraman dan Ketertiban",
    "Pembinaan Kerukunan Umat Beragama",
    "Pengadaan Sarana Prasarana Olahraga",
    "Pembinaan Lembaga Adat",
    "Kegiatan Posyandu",
  ],
  "Pemberdayaan Masyarakat": [
    "Pelatihan Kepala Desa dan Perangkat Desa",
    "Pelatihan BPD",
    "Peningkatan Kapasitas Masyarakat",
    "Pelatihan Kelompok Tani",
    "Pelatihan UMKM",
  ],
  "Penanggulangan Bencana & Darurat": [
    "Penanggulangan Bencana",
    "Keadaan Darurat",
    "Keadaan Mendesak",
  ],
};

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

