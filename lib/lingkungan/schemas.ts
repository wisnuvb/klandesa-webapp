import { z } from "zod";

const incidentTypes = [
  "pollution",
  "illegal_dump",
  "flood",
  "landslide",
  "fire",
  "other",
] as const;

const severities = ["low", "medium", "high", "critical"] as const;

export const wasteBankInputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  managerName: z.string().trim().max(255).optional().nullable(),
  rt: z.string().trim().max(10).optional().nullable(),
  rw: z.string().trim().max(10).optional().nullable(),
  address: z.string().trim().max(2000).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  wasteTypes: z.array(z.string()).optional(),
  monthlyKg: z.number().min(0).optional(),
  status: z.string().trim().max(50).optional(),
});

export type WasteBankInput = z.infer<typeof wasteBankInputSchema>;

export function parseWasteBankInput(body: unknown): WasteBankInput | null {
  const parsed = wasteBankInputSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}

export const environmentalIncidentInputSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).optional().nullable(),
  incidentType: z.enum(incidentTypes),
  severity: z.enum(severities).optional(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  rt: z.string().trim().max(10).optional().nullable(),
  rw: z.string().trim().max(10).optional().nullable(),
  status: z.string().trim().max(50).optional(),
  checklist: z
    .array(
      z.object({
        label: z.string(),
        done: z.boolean().optional(),
      }),
    )
    .optional(),
});

export type EnvironmentalIncidentInput = z.infer<
  typeof environmentalIncidentInputSchema
>;

export function parseEnvironmentalIncidentInput(
  body: unknown,
): EnvironmentalIncidentInput | null {
  const parsed = environmentalIncidentInputSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}

const disasterTypes = [
  "flood",
  "landslide",
  "earthquake",
  "fire",
  "drought",
  "other",
] as const;

const riskLevels = ["low", "medium", "high", "extreme"] as const;

export const disasterPointInputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  disasterType: z.enum(disasterTypes),
  riskLevel: z.enum(riskLevels).optional(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  rt: z.string().trim().max(10).optional().nullable(),
  rw: z.string().trim().max(10).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  evacuationPlan: z.string().trim().max(5000).optional().nullable(),
  status: z.string().trim().max(50).optional(),
  lastCheckedAt: z.string().optional().nullable(),
});

export type DisasterPointInput = z.infer<typeof disasterPointInputSchema>;

export function parseDisasterPointInput(body: unknown): DisasterPointInput | null {
  const parsed = disasterPointInputSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}

export const DEFAULT_EARLY_WARNING_CHECKLIST = [
  { label: "Koordinasi dengan BPBD/BPBD kabupaten", done: false },
  { label: "Siapkan titik kumpul/evakuasi", done: false },
  { label: "Informasikan RT/RW terdampak", done: false },
  { label: "Cek persediaan logistik darurat", done: false },
  { label: "Dokumentasi kondisi lapangan", done: false },
];
