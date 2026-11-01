import type { Overview, MemberList, EquipmentView, RiskView, RiskHint, ContactView } from "@/lib/keamanan/service";
import type { GroupView, ScheduleNight, SwapView, RondaLogView, GenerateResult } from "@/lib/keamanan/ronda";
import type { SecurityEventDetail, SecurityEventRow } from "@/lib/keamanan/kejadian";
import type { Finding } from "@/lib/keamanan/calc";

export type Can = Record<"read" | "create" | "update" | "delete" | "export" | "approve", boolean>;
export type OverviewResp = Overview & { can: Can; detail: boolean };
export type MembersResp = MemberList & { roles: Record<string, string>; squadKinds: Record<string, string>; endReasons: Record<string, string>; can: Can; detail: boolean };
export type EquipmentResp = { rows: EquipmentView[]; inventoryOptions: { id: number; label: string }[]; categories: Record<string, string>; conditions: Record<string, string>; can: Can };
export type RisksResp = { rows: RiskView[]; hints: RiskHint[]; kinds: Record<string, string>; levels: Record<string, string>; can: Can };
export type ContactsResp = { rows: ContactView[]; kinds: Record<string, string>; national: { name: string; value: string; note: string }[]; can: Can };
export type GroupsResp = { rows: GroupView[]; can: Can; detail: boolean; today: string };
export type ScheduleResp = { group: { id: number; name: string; perShift: number; startTime: string }; nights: ScheduleNight[]; from: string; to: string; today: string; nowTime: string; attendance: Record<string, string>; markable: string[]; can: Can };
export type SwapsResp = { rows: SwapView[]; can: Can };
export type LogsResp = { rows: RondaLogView[]; total: number; page: number; pageSize: number; kinds: Record<string, string>; can: Can };
export type EventsResp = { rows: SecurityEventRow[]; total: number; page: number; pageSize: number; kinds: Record<string, string>; responseKinds: Record<string, string>; can: Can };
export type DetailResp = SecurityEventDetail & { can: Can; detail: boolean };
export type { Finding, GenerateResult, ScheduleNight, GroupView, SwapView, RondaLogView, SecurityEventRow };
