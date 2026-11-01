import type { Overview } from "@/lib/bencana/service";
import type { Readiness } from "@/lib/bencana/service";
import type { DomainSummary, EventDetail, EventList, EventView } from "@/lib/incident/service";

export type Can = Record<"read" | "create" | "update" | "delete" | "export" | "approve", boolean>;
export type Resp = Overview & { incidents: DomainSummary; can: Can; detail: boolean };
export type EventsResp = EventList & { kinds: Record<string, string>; responseKinds: Record<string, string>; can: Can };
export type DetailResp = EventDetail & { can: Can; detail: boolean };
export type ReadinessResp = Readiness & { statuses: Record<string, string>; levels: Record<string, string>; assessmentKinds: Record<string, string>; regulation: { short: string; title: string }; notes: string[]; can: Can };
export type { EventView };
