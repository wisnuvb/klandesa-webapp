/**
 * Taksonomi keuangan desa yang dipakai bersama oleh form (klien) dan ringkasan (server).
 * Form menyimpan sub-kategori/sub-kegiatan sebagai akhiran deskripsi: "uraian (Sub)".
 */

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

/** Nama kategori penerimaan di dialog "Catat Transaksi" → kelompok & sub-kategori pendapatan. */
export const LEGACY_INCOME_CATEGORY: Record<string, { kategori: string; sub: string }> = {
  "Penerimaan Dana Desa": { kategori: "Transfer", sub: "Dana Desa" },
  "Penerimaan ADD": { kategori: "Transfer", sub: "Alokasi Dana Desa (ADD)" },
  "Penerimaan Bagi Hasil Pajak": { kategori: "Transfer", sub: "Bagi Hasil Pajak & Retribusi" },
  "Hasil Usaha Desa": { kategori: "PADes", sub: "Hasil Usaha Desa" },
  "Hasil Aset Desa": { kategori: "PADes", sub: "Hasil Aset Desa" },
  "Swadaya Masyarakat": { kategori: "PADes", sub: "Swadaya dan Partisipasi" },
  "Hibah dan Sumbangan": { kategori: "Lain-lain", sub: "Hibah dan Sumbangan" },
  "Lain-lain Pendapatan": { kategori: "Lain-lain", sub: "Lain-lain Pendapatan Desa" },
};

export const SUB_FALLBACK = "Lainnya";

/** Ambil label sub dari akhiran " (Sub)" bila cocok dengan salah satu opsi yang dikenal. */
export function extractSubLabel(description: string, options: readonly string[] | undefined): string | null {
  const m = /\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*$/.exec(description.trim());
  if (!m) return null;
  const found = options?.find((o) => o.toLowerCase() === m[1]!.trim().toLowerCase());
  return found ?? null;
}

/** Kelompokkan transaksi pendapatan ke kategori & sub yang sama dengan form "Catat Pendapatan". */
export function classifyIncome(category: string, description: string): { kategori: string; sub: string } {
  const cat = category.trim();
  const group = Object.keys(subKategoriOptions).find((k) => k.toLowerCase() === cat.toLowerCase());
  if (group) {
    return { kategori: group, sub: extractSubLabel(description, subKategoriOptions[group]) ?? SUB_FALLBACK };
  }
  const legacy = Object.entries(LEGACY_INCOME_CATEGORY).find(([k]) => k.toLowerCase() === cat.toLowerCase());
  if (legacy) return legacy[1];
  return { kategori: cat || "Pendapatan Lainnya", sub: SUB_FALLBACK };
}

/** Bidang belanja + sub-kegiatan (bila ada di akhiran deskripsi). */
export function classifyExpense(category: string, description: string): { bidang: string; sub: string } {
  const cat = category.trim() || "Belanja Lainnya";
  const group = Object.keys(subKegiatanOptions).find((k) => k.toLowerCase() === cat.toLowerCase());
  return {
    bidang: group ?? cat,
    sub: (group && extractSubLabel(description, subKegiatanOptions[group])) || SUB_FALLBACK,
  };
}
