import type { IdmOverview } from "@/lib/idm/service";

export type Can = Record<"read" | "create" | "update" | "delete" | "export" | "approve", boolean>;
export type Resp = IdmOverview & {
  can: Can;
  catalog: { dimensions: Record<string, string>; layouts: Record<string, string>; limits: { indicatorsPerYear: number; maxFileMb: number; maxRows: number; maxScore: number }; focusRef: string; sources: readonly { ref: string; note: string; status: string }[] };
};
export const fmtScore = (v: number | null | undefined): string => (v === null || v === undefined ? "-" : v.toLocaleString("id-ID", { maximumFractionDigits: 4 }));
