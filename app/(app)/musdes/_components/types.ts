import type { AttendeeView, DecisionView, MeetingView } from "@/lib/musdes/service";
import type { InclusionWarning } from "@/lib/musdes/catalog";

export type { AttendeeView, DecisionView, MeetingView, InclusionWarning };
export type Can = Record<"read" | "create" | "update" | "delete" | "export" | "approve", boolean>;

export interface ListResponse {
  meetings: (MeetingView & { attendeeCount: number; decisionCount: number })[];
  total: number;
  page: number;
  pageSize: number;
  can: Can;
}

export interface DetailResponse {
  meeting: MeetingView;
  attendees: AttendeeView[];
  decisions: DecisionView[];
  counts: { invited: number; present: number; women: number };
  warnings: InclusionWarning[];
  can: Can;
  village: { name: string };
}
