/** Copy integrasi konsisten antara landing — bahasa untuk pemdes/pemda. */

export type IntegrationStub = {
  id: string;
  label: string;
  description: string;
};

export const INTEGRATION_ADAPTERS_STUB: IntegrationStub[] = [
  {
    id: "residents_kemendesa",
    label: "Data penduduk — format Kemendesa",
    description:
      "Unduh CSV/JSON standar untuk keperluan seperti Prodeskel atau portal SDGs Desa.",
  },
  {
    id: "apbdes_siskeudes",
    label: "APBDes — siap dibuka di spreadsheet Siskeudes",
    description:
      "Ringkasan anggaran dari modul keuangan desa disusun dalam format yang konsisten.",
  },
  {
    id: "sdgs_portal",
    label: "Ringkasan skor 18 tujuan SDGs",
    description:
      "File JSON berisi profil desa, ringkasan capaian per tujuan, dan peta capaian per RT/RW.",
  },
  {
    id: "prodeskel",
    label: "Profil desa & potensi wilayah",
    description:
      "Cuplikan demografi, KK, dan potensi wilayah untuk dokumentasi ke kabupaten.",
  },
];

export function listIntegrationAdapters(): IntegrationStub[] {
  return INTEGRATION_ADAPTERS_STUB;
}

export const KEMENDESA_HUB_NOTE =
  "Saat ini fokus pada unduhan format standar, catatan riwayat pengiriman, dan pengulangan jika gagal—bukan sinkron otomatis ke sistem pusat tanpa akses resmi.";

export const BUILDING_NOTE =
  "Format unduhan dirancang agar nanti dapat disambung ke konektor resmi ketika kredensial Kemendesa tersedia di tingkat desa atau kabupaten.";
