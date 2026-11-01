import type { PlanView, ProgramView } from "@/lib/rpjm/service";
import type { Step } from "@/lib/rpjm/steps";

export type { PlanView, ProgramView, Step };
export type Can = Record<"read" | "create" | "update" | "delete" | "export" | "approve", boolean>;

export interface ListResponse {
  plans: {
    id: number;
    title: string;
    status: string;
    periodStart: number;
    periodEnd: number;
    termYears: number;
    locked: boolean;
    untouched: boolean;
    enactedBeforeApp: boolean;
    programCount: number;
    totalBudget: string;
    progress: { done: number; total: number };
    overdue: number;
    next: { key: string; label: string; due: string | null; state: string } | null;
    needsAdjustment: boolean;
    flagCount: number;
    topFlag: string | null;
  }[];
  can: Can;
  rules: { termYears: number };
}

export interface DetailResponse {
  plan: PlanView;
  options: {
    meetings: { id: number; kind: string; title: string; status: string; heldOn: string | null }[];
    perdes: { id: number; number: string; year: number; title: string; enactedAt: string | null }[];
  };
  can: Can;
  village: { name: string };
  terms: {
    fields: Record<string, string>;
    paguSources: Record<string, string>;
    methods: Record<string, string>;
    teamRoles: Record<string, string>;
    changeReasons: Record<string, string>;
    activityCodes: { code: string; name: string }[];
    rules: { termYears: number; teamMin: number };
  };
}
