/** Copy integrasi konsisten antara landing tanpa mengimpor server-only. */

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
      "Export CSV/JSON standar untuk alur seperti Prodeskel / SDGs Desa.",
  },
  {
    id: "apbdes_siskeudes",
    label: "APBDes — siap konsumsi spreadsheet Siskeudes",
    description:
      "Ringkasan anggaran dari modul keuangan desa menjadi format struktur konsisten.",
  },
  {
    id: "sdgs_portal",
    label: "Ringkasan skor 18 SDGs",
    description:
      "Payload JSON mencakup village profile, summary goal, serta heatmap RT/RW dari engine internal.",
  },
  {
    id: "prodeskel",
    label: "Profil desa & potensi wilayah",
    description:
      "Snapshot demografi KK, KK, serta potensi agregasi untuk dokumentasi wilayah.",
  },
];

export function listIntegrationAdapters(): IntegrationStub[] {
  return INTEGRATION_ADAPTERS_STUB;
}

export const KEMENDESA_HUB_NOTE =
  "Pada tahap ini, integrasi berfokus pada ekspor format standar, log sinkronisasi yang dapat diaudit, dan retry—bukan sinkronisasi real-time ke sistem pemerintah tanpa akses resmi.";

export const BUILDING_NOTE =
  "Adapter dirancang agar nanti dapat diganti dengan konektor resmi ketika kredensial API Kemendesa tersedia di tingkat desa atau kabupaten.";
