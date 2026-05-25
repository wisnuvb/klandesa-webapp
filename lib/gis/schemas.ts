import { z } from "zod";
import { parseSdgGoalIds } from "@/lib/sdgs/parse-goals";

const assetTypes = [
  "road",
  "bridge",
  "drainage",
  "water",
  "electricity",
  "school",
  "health",
  "other",
] as const;

const conditions = ["good", "fair", "poor", "critical"] as const;

export const villageAssetInputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  assetType: z.enum(assetTypes),
  description: z.string().trim().max(5000).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  rt: z.string().trim().max(10).optional().nullable(),
  rw: z.string().trim().max(10).optional().nullable(),
  condition: z.enum(conditions).optional(),
  sdgGoalIds: z.array(z.number()).optional(),
  status: z.string().trim().max(50).optional(),
});

export type VillageAssetInput = z.infer<typeof villageAssetInputSchema>;

export function parseVillageAssetInput(body: unknown): VillageAssetInput | null {
  const parsed = villageAssetInputSchema.safeParse(body);
  if (!parsed.success) return null;
  return {
    ...parsed.data,
    sdgGoalIds: parseSdgGoalIds(parsed.data.sdgGoalIds),
  };
}

const projectTypes = ["construction", "repair", "maintenance", "planning"] as const;
const projectStatuses = ["planned", "ongoing", "completed", "cancelled"] as const;

export const infrastructureProjectInputSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).optional().nullable(),
  projectType: z.enum(projectTypes),
  budget: z.number().min(0).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  rt: z.string().trim().max(10).optional().nullable(),
  rw: z.string().trim().max(10).optional().nullable(),
  assetId: z.number().int().positive().optional().nullable(),
  sdgGoalIds: z.array(z.number()).optional(),
  status: z.enum(projectStatuses).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

export type InfrastructureProjectInput = z.infer<
  typeof infrastructureProjectInputSchema
>;

export function parseInfrastructureProjectInput(
  body: unknown,
): InfrastructureProjectInput | null {
  const parsed = infrastructureProjectInputSchema.safeParse(body);
  if (!parsed.success) return null;
  return {
    ...parsed.data,
    sdgGoalIds: parseSdgGoalIds(parsed.data.sdgGoalIds),
  };
}

export function parseOptionalDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
