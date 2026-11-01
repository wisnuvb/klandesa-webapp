import type { Candidate, PrintData, ProgramListItem, ProgramView } from "@/lib/blt/service";

export type { Candidate, PrintData, ProgramListItem, ProgramView };
export type Can = Record<"read" | "create" | "update" | "delete" | "export" | "approve", boolean>;
export interface DetailResponse {
  program: ProgramView;
  village: { name: string };
  can: Can;
}
export interface TabProps {
  data: DetailResponse;
  reload: () => void;
}
