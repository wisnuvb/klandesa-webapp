import { parseSdgGoalIds } from "@/lib/sdgs/parse-goals";

export function parseRtRwActivityInput(body: unknown): {
  rt: string;
  rw: string;
  title: string;
  description?: string;
  activityType: string;
  activityDate: string;
  participantCount?: number;
  budgetUsed?: number;
  sdgGoalIds: number[];
} | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const rt = typeof b.rt === "string" ? b.rt.trim() : "";
  const rw = typeof b.rw === "string" ? b.rw.trim() : "";
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const activityType = typeof b.activityType === "string" ? b.activityType.trim() : "";
  const activityDate = typeof b.activityDate === "string" ? b.activityDate : "";
  if (!rt || !rw || !title || !activityType || !activityDate) return null;

  const participants = b.participantCount != null ? Number(b.participantCount) : undefined;
  const budget = b.budgetUsed != null ? Number(b.budgetUsed) : undefined;

  return {
    rt,
    rw,
    title,
    description: typeof b.description === "string" ? b.description.trim() : undefined,
    activityType,
    activityDate,
    participantCount:
      participants != null && Number.isFinite(participants) ? Math.trunc(participants) : undefined,
    budgetUsed: budget != null && Number.isFinite(budget) ? budget : undefined,
    sdgGoalIds: parseSdgGoalIds(b.sdgGoalIds),
  };
}

export function parseCommunityProposalInput(body: unknown): {
  proposerName: string;
  rt?: string;
  rw?: string;
  title: string;
  description: string;
  proposalType?: string;
  sdgGoalIds: number[];
} | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const proposerName = typeof b.proposerName === "string" ? b.proposerName.trim() : "";
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const description = typeof b.description === "string" ? b.description.trim() : "";
  if (!proposerName || !title || !description) return null;

  return {
    proposerName,
    rt: typeof b.rt === "string" ? b.rt.trim() : undefined,
    rw: typeof b.rw === "string" ? b.rw.trim() : undefined,
    title,
    description,
    proposalType: typeof b.proposalType === "string" ? b.proposalType : undefined,
    sdgGoalIds: parseSdgGoalIds(b.sdgGoalIds),
  };
}
