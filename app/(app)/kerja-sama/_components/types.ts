import type { AgreementDetail, AgreementRow } from "@/lib/kerja-sama/service";

export type Can = Record<"read" | "create" | "update" | "delete" | "export" | "approve", boolean>;
export interface ListCatalog {
  kinds: Record<string, string>;
  initiatives: Record<string, string>;
  fields: Record<string, string>;
  status: Record<string, string>;
  endReasons: Record<string, string>;
  sources: readonly { ref: string; note: string; status: string }[];
}
export type ListResp = { year: number; agreements: AgreementRow[]; can: Can; catalog: ListCatalog };
export type DetailResp = AgreementDetail & { can: Can; catalog: { fields: Record<string, string>; status: Record<string, string>; endReasons: Record<string, string>; partyKinds: Record<string, string> } };
export const STATUS_TONE: Record<string, string> = { PERSIAPAN: "neutral", PENAWARAN: "info", PENYUSUNAN: "info", DITANDATANGANI: "soon", PELAKSANAAN: "soon", SELESAI: "done", BATAL: "overdue" };
export const moneyRaw = (v: string | null | undefined): string => (v ? String(Math.round(Number(v))) : "");
