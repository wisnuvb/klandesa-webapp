import type { Overview } from "@/lib/dana-desa/service";

export type { Overview };
export type Can = Record<"read" | "create" | "update" | "delete" | "export" | "approve", boolean>;
export type Resp = Overview & { village: { name: string }; can: Can };
export interface TabProps {
  data: Resp;
  year: number;
  reload: () => void;
}
