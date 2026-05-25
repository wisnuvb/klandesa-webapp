import type { IntegrationAdapterMeta } from "./types";

export const INTEGRATION_ADAPTERS: IntegrationAdapterMeta[] = [
  {
    id: "residents_kemendesa",
    label: "Data Penduduk (Kemendesa)",
    description:
      "Export data warga format standar Kemendesa untuk Prodeskel / SDGs Desa.",
    direction: "export",
    formats: ["csv", "json"],
    kemendesaSchema: "penduduk_v1",
  },
  {
    id: "apbdes_siskeudes",
    label: "APBDes → Siskeudes",
    description:
      "Export anggaran & transaksi keuangan desa untuk sinkronisasi Siskeudes.",
    direction: "export",
    formats: ["csv", "json"],
    kemendesaSchema: "apbdes_v1",
  },
  {
    id: "sdgs_portal",
    label: "Skor SDGs Desa Portal",
    description: "Push ringkasan skor 18 goal SDGs ke format portal SDGs Desa.",
    direction: "push",
    formats: ["json"],
    kemendesaSchema: "sdgs_score_v1",
  },
  {
    id: "prodeskel",
    label: "Prodeskel (Profil Desa)",
    description:
      "Export profil desa, potensi, dan statistik demografi untuk Prodeskel.",
    direction: "export",
    formats: ["csv", "json"],
    kemendesaSchema: "prodeskel_v1",
  },
];

export function getAdapterMeta(id: string): IntegrationAdapterMeta | undefined {
  return INTEGRATION_ADAPTERS.find((a) => a.id === id);
}
