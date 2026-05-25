export type SdgGoalDefinition = {
  id: number;
  slug: string;
  title: string;
  shortTitle: string;
};

/** 18 indikator SDGs Desa (Kemendesa). */
export const SDG_GOALS: SdgGoalDefinition[] = [
  { id: 1, slug: "tanpa-kemiskinan", title: "Desa Tanpa Kemiskinan", shortTitle: "Kemiskinan" },
  { id: 2, slug: "tanpa-kelaparan", title: "Desa Tanpa Kelaparan", shortTitle: "Kelaparan" },
  { id: 3, slug: "sehat-sejahtera", title: "Desa Sehat dan Sejahtera", shortTitle: "Kesehatan" },
  { id: 4, slug: "pendidikan-berkualitas", title: "Pendidikan Desa Berkualitas", shortTitle: "Pendidikan" },
  { id: 5, slug: "keterlibatan-perempuan", title: "Keterlibatan Perempuan Desa", shortTitle: "Perempuan" },
  { id: 6, slug: "air-bersih-sanitasi", title: "Desa Layak Air Bersih dan Sanitasi", shortTitle: "Air & Sanitasi" },
  { id: 7, slug: "energi-bersih", title: "Desa Berenergi Bersih dan Terbarukan", shortTitle: "Energi" },
  { id: 8, slug: "ekonomi-merata", title: "Pertumbuhan Ekonomi Desa Merata", shortTitle: "Ekonomi" },
  { id: 9, slug: "infrastruktur-inovasi", title: "Infrastruktur dan Inovasi Desa Sesuai Kebutuhan", shortTitle: "Infrastruktur" },
  { id: 10, slug: "tanpa-kesenjangan", title: "Desa Tanpa Kesenjangan", shortTitle: "Kesenjangan" },
  { id: 11, slug: "permukiman-aman", title: "Kawasan Permukiman Desa Aman dan Nyaman", shortTitle: "Permukiman" },
  { id: 12, slug: "konsumsi-produksi", title: "Konsumsi dan Produksi Desa Sadar Lingkungan", shortTitle: "Konsumsi" },
  { id: 13, slug: "tanggap-iklim", title: "Desa Tanggap Perubahan Iklim", shortTitle: "Iklim" },
  { id: 14, slug: "lingkungan-laut", title: "Desa Peduli Lingkungan Laut", shortTitle: "Laut" },
  { id: 15, slug: "lingkungan-darat", title: "Desa Peduli Lingkungan Darat", shortTitle: "Darat" },
  { id: 16, slug: "damai-berkeadilan", title: "Desa Damai Berkeadilan", shortTitle: "Damai" },
  { id: 17, slug: "kemitraan", title: "Kemitraan untuk Pembangunan Desa", shortTitle: "Kemitraan" },
  { id: 18, slug: "kelembagaan-budaya", title: "Kelembagaan Desa Dinamis dan Budaya Desa Adaptif", shortTitle: "Kelembagaan" },
];

export const KEMENDESA_SDGS_URL = "https://dashboard-sdgs.kemendesa.go.id/";
