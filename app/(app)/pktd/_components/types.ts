import type { ActivityListItem, ActivityView, Candidate, PrintData } from "@/lib/pktd/service";

export type { ActivityListItem, ActivityView, Candidate, PrintData };
export type Can = Record<"read" | "create" | "update" | "delete" | "export" | "approve", boolean>;
export interface DetailResponse {
  activity: ActivityView;
  village: { name: string };
  can: Can;
}
export interface TabProps {
  data: DetailResponse;
  reload: () => void;
}
