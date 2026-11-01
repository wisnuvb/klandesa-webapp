import type { Overview } from "@/lib/kdmp/service";

export type Can = Record<"read" | "create" | "update" | "delete" | "export" | "approve", boolean>;
export type Resp = Overview & { can: Can };
export type Facility = Overview["facilities"][number];
export interface TabProps {
  data: Resp;
  reload: () => void;
}
