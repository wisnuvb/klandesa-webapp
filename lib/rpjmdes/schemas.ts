import { parseSdgGoalIds } from "@/lib/sdgs/parse-goals";

export function parsePlanInput(body: unknown): {
  title: string;
  periodStart: number;
  periodEnd: number;
  vision?: string;
  mission?: string;
  status?: string;
} | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const periodStart = Number(b.periodStart);
  const periodEnd = Number(b.periodEnd);
  if (!title || !Number.isFinite(periodStart) || !Number.isFinite(periodEnd)) {
    return null;
  }
  return {
    title,
    periodStart: Math.trunc(periodStart),
    periodEnd: Math.trunc(periodEnd),
    vision: typeof b.vision === "string" ? b.vision.trim() : undefined,
    mission: typeof b.mission === "string" ? b.mission.trim() : undefined,
    status: typeof b.status === "string" ? b.status : undefined,
  };
}

export function parseActivityInput(body: unknown): {
  planId: number;
  title: string;
  description?: string;
  year: number;
  location?: string;
  estimatedBudget?: number;
  sdgGoalIds: number[];
  status?: string;
} | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const planId = Number(b.planId);
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const year = Number(b.year);
  if (!Number.isFinite(planId) || planId <= 0 || !title || !Number.isFinite(year)) {
    return null;
  }
  const budget = b.estimatedBudget != null ? Number(b.estimatedBudget) : undefined;
  return {
    planId: Math.trunc(planId),
    title,
    description: typeof b.description === "string" ? b.description.trim() : undefined,
    year: Math.trunc(year),
    location: typeof b.location === "string" ? b.location.trim() : undefined,
    estimatedBudget: budget != null && Number.isFinite(budget) ? budget : undefined,
    sdgGoalIds: parseSdgGoalIds(b.sdgGoalIds),
    status: typeof b.status === "string" ? b.status : undefined,
  };
}

export function parseProposalInput(body: unknown): {
  planId?: number;
  proposerName: string;
  proposerNik?: string;
  rt?: string;
  rw?: string;
  title: string;
  description: string;
  sdgGoalIds: number[];
} | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const proposerName = typeof b.proposerName === "string" ? b.proposerName.trim() : "";
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const description = typeof b.description === "string" ? b.description.trim() : "";
  if (!proposerName || !title || !description) return null;

  const planIdRaw = b.planId != null ? Number(b.planId) : undefined;
  return {
    planId:
      planIdRaw != null && Number.isFinite(planIdRaw) && planIdRaw > 0
        ? Math.trunc(planIdRaw)
        : undefined,
    proposerName,
    proposerNik: typeof b.proposerNik === "string" ? b.proposerNik.trim() : undefined,
    rt: typeof b.rt === "string" ? b.rt.trim() : undefined,
    rw: typeof b.rw === "string" ? b.rw.trim() : undefined,
    title,
    description,
    sdgGoalIds: parseSdgGoalIds(b.sdgGoalIds),
  };
}
