/**
 * Entitas kesiapsiagaan yang berbagi satu pola rute CRUD (/api/bencana/data/[entity]). Setiap entri membungkus fungsi servis;
 * rute tidak berisi logika bisnis. Kunci URL memakai bahasa Indonesia.
 */
import type { PrismaClient } from "@prisma/client";
import type { Result } from "@/lib/form-input";
import * as S from "./service";

export type EntityKey = "ancaman" | "sumber-daya" | "relawan" | "rencana";
export const isEntityKey = (v: string): v is EntityKey => v === "ancaman" || v === "sumber-daya" || v === "relawan" || v === "rencana";

export interface EntityOps {
  /** Nama tabel untuk audit */
  table: string;
  list(db: PrismaClient, a: { villageId: number; detail: boolean }): Promise<unknown>;
  create(db: PrismaClient, a: { villageId: number; userId: number | null; input: unknown }): Promise<Result<Record<string, unknown>>>;
  patch(db: PrismaClient, a: { villageId: number; id: number; input: unknown }): Promise<Result<Record<string, unknown>>>;
  remove(db: PrismaClient, a: { villageId: number; id: number }): Promise<Result<Record<string, unknown>>>;
}

export const ENTITIES: Record<EntityKey, EntityOps> = {
  ancaman: { table: "drm_hazards", list: (db, a) => S.listHazards(db, a), create: S.createHazard, patch: S.patchHazard, remove: S.removeHazard },
  "sumber-daya": { table: "drm_resources", list: (db, a) => S.listResources(db, a), create: S.createResource, patch: S.patchResource, remove: S.removeResource },
  relawan: { table: "drm_volunteers", list: (db, a) => S.listVolunteers(db, a), create: S.createVolunteer, patch: S.patchVolunteer, remove: S.removeVolunteer },
  rencana: { table: "drm_plans", list: (db, a) => S.listPlans(db, a), create: S.createPlan, patch: S.patchPlan, remove: S.removePlan },
};
