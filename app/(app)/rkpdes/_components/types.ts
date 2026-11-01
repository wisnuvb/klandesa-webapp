import type { ActivityView, DocumentView } from "@/lib/rkpdes/service";
import type { Step } from "@/lib/rkpdes/steps";

export type { ActivityView, DocumentView, Step };
export type Can = Record<"read" | "create" | "update" | "delete" | "export" | "approve", boolean>;

export interface ListResponse {
  documents: {
    id: number;
    year: number;
    revision: number;
    locked: boolean;
    activityCount: number;
    progress: { done: number; total: number };
    overdue: number;
    next: { key: string; label: string; due: string | null; state: string } | null;
  }[];
  plans: { id: number; title: string; periodStart: number; periodEnd: number; status: string; termYears: number; termNote: string | null }[];
  meetingsCount: number;
  can: Can;
  terms: { changeReasons: Record<string, string> };
}

export interface DetailResponse {
  document: DocumentView;
  options: {
    meetings: { id: number; kind: string; title: string; status: string; heldOn: string | null }[];
    perdes: { id: number; number: string; year: number; title: string; enactedAt: string | null }[];
  };
  can: Can;
  village: { name: string };
  terms: {
    paguSources: Record<string, string>;
    methods: Record<string, string>;
    teamRoles: Record<string, string>;
    incomingLevels: Record<string, string>;
    teamLimits: { min: number; max: number };
    activityCodes: { code: string; name: string }[];
  };
}
