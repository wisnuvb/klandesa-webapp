import type { PackageDetail, PengadaanList } from "@/lib/pengadaan/service";

export type Can = Record<"read" | "create" | "update" | "delete" | "export" | "approve", boolean>;
export interface Catalog {
  modes: Record<string, string>;
  methods: Record<string, string>;
  status: Record<string, string>;
  roles: Record<string, string>;
  elements: Record<string, string>;
  exampleLimits: { directLimit: number; offerLimit: number };
  sources: readonly { ref: string; note: string; status: string }[];
}
export type ListResp = PengadaanList & { can: Can; catalog: Catalog };
export type DetailResp = PackageDetail & { can: Can; catalog: Omit<Catalog, "exampleLimits" | "sources"> };
export const STATUS_TONE: Record<string, string> = { PERSIAPAN: "neutral", PEMILIHAN: "info", PELAKSANAAN: "soon", SELESAI: "done", BATAL: "overdue" };
export const moneyRaw = (v: string | null | undefined): string => (v ? String(Math.round(Number(v))) : "");
