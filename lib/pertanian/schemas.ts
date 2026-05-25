import { parseSdgGoalIds } from "@/lib/sdgs/parse-goals";

export function parseFarmPlotInput(body: unknown): {
  name: string;
  location?: string;
  areaHa?: number;
  cropType?: string;
  ownerName?: string;
  rt?: string;
  rw?: string;
  potentialId?: number;
} | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return null;

  const potentialIdRaw = b.potentialId != null ? Number(b.potentialId) : undefined;
  const areaHa = b.areaHa != null ? Number(b.areaHa) : undefined;

  return {
    name,
    location: typeof b.location === "string" ? b.location.trim() : undefined,
    areaHa: areaHa != null && Number.isFinite(areaHa) ? areaHa : undefined,
    cropType: typeof b.cropType === "string" ? b.cropType.trim() : undefined,
    ownerName: typeof b.ownerName === "string" ? b.ownerName.trim() : undefined,
    rt: typeof b.rt === "string" ? b.rt.trim() : undefined,
    rw: typeof b.rw === "string" ? b.rw.trim() : undefined,
    potentialId:
      potentialIdRaw != null && Number.isFinite(potentialIdRaw) && potentialIdRaw > 0
        ? Math.trunc(potentialIdRaw)
        : undefined,
  };
}

export function parseCropCycleInput(body: unknown): {
  plotId: number;
  season: string;
  cropName: string;
  plantedAt?: string;
  harvestExpectedAt?: string;
} | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const plotId = Number(b.plotId);
  const season = typeof b.season === "string" ? b.season.trim() : "";
  const cropName = typeof b.cropName === "string" ? b.cropName.trim() : "";
  if (!Number.isFinite(plotId) || plotId <= 0 || !season || !cropName) return null;

  return {
    plotId: Math.trunc(plotId),
    season,
    cropName,
    plantedAt: typeof b.plantedAt === "string" ? b.plantedAt : undefined,
    harvestExpectedAt:
      typeof b.harvestExpectedAt === "string" ? b.harvestExpectedAt : undefined,
  };
}

export function parseHarvestInput(body: unknown): {
  cycleId: number;
  harvestDate: string;
  quantityKg?: number;
  qualityGrade?: string;
  marketPricePerKg?: number;
  notes?: string;
} | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const cycleId = Number(b.cycleId);
  const harvestDate = typeof b.harvestDate === "string" ? b.harvestDate : "";
  if (!Number.isFinite(cycleId) || cycleId <= 0 || !harvestDate) return null;

  const qty = b.quantityKg != null ? Number(b.quantityKg) : undefined;
  const price = b.marketPricePerKg != null ? Number(b.marketPricePerKg) : undefined;

  return {
    cycleId: Math.trunc(cycleId),
    harvestDate,
    quantityKg: qty != null && Number.isFinite(qty) ? qty : undefined,
    qualityGrade: typeof b.qualityGrade === "string" ? b.qualityGrade.trim() : undefined,
    marketPricePerKg: price != null && Number.isFinite(price) ? price : undefined,
    notes: typeof b.notes === "string" ? b.notes.trim() : undefined,
  };
}

export function parseSdgTagsInput(body: unknown): number[] | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (!("sdgGoalIds" in b)) return null;
  return parseSdgGoalIds(b.sdgGoalIds);
}
