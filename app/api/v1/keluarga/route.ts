import type { Prisma } from "@prisma/client";
import { requireApiKey } from "@/lib/api-keys/auth";
import { prisma } from "@/lib/prisma";
import { isKependudukanV2 } from "@/lib/kependudukan/sync";
import { apiOk, badRequest, featureOff } from "@/lib/api-v1/http";
import { parsePaging, slicePage } from "@/lib/api-v1/page";
import { HOUSEHOLD_SELECT, householdView } from "@/lib/api-v1/views";

/** Daftar keluarga (KK tersamar). Filter: status (ACTIVE|INACTIVE, bawaan ACTIVE), rt, rw, dusun, tanpaKepala=1. */
export async function GET(req: Request) {
  const auth = await requireApiKey(req, "kependudukan:read");
  if (!auth.ok) return auth.response;
  if (!isKependudukanV2(auth.ctx.village.settings)) return featureOff(auth);

  const sp = new URL(req.url).searchParams;
  const paging = parsePaging(sp);
  if (!paging.ok) return badRequest(auth, paging.message);
  const status = sp.get("status") ?? "ACTIVE";
  if (status !== "ACTIVE" && status !== "INACTIVE") return badRequest(auth, "status harus ACTIVE atau INACTIVE.");

  const where: Prisma.HouseholdWhereInput = {
    villageId: auth.ctx.village.id,
    status,
    ...(paging.cursor ? { id: { gt: paging.cursor } } : {}),
    ...(sp.get("rt") ? { rt: sp.get("rt")!.slice(0, 10) } : {}),
    ...(sp.get("rw") ? { rw: sp.get("rw")!.slice(0, 10) } : {}),
    ...(sp.get("dusun") ? { hamlet: sp.get("dusun")!.slice(0, 100) } : {}),
    ...(sp.get("tanpaKepala") === "1" ? { headResidentId: null } : {}),
  };
  const rows = await prisma.household.findMany({ where, orderBy: { id: "asc" }, take: paging.limit + 1, select: HOUSEHOLD_SELECT });
  const { data, page } = slicePage(rows, paging.limit, (r) => r.id);
  return apiOk(auth, { data: data.map(householdView), page });
}
