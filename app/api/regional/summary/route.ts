import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-session";
import { logRegionalAccess } from "@/lib/regional-audit";
import { prisma } from "@/lib/prisma";
import { checkRegionalRateLimit } from "@/lib/regional-rate-limit";
import {
  filterVillageIdsForAggregate,
  getRegionalSession,
  listVillagesInRegionalScope,
} from "@/lib/regional-scope";

export const dynamic = "force-dynamic";

/**
 * Ringkasan agregat wilayah: hanya metadata desa + hitungan agregat (tanpa PII warga).
 */
export async function GET(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRegionalRateLimit(ip, "regional_summary");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi nanti." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  const session = await getApiSession(req);
  const regional = getRegionalSession(session);
  if (!regional) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const villages = await listVillagesInRegionalScope(regional.scope);
  const villageIds = filterVillageIdsForAggregate(villages);

  if (villageIds.length === 0) {
    await logRegionalAccess({
      regionalUserId: regional.regionalUserId,
      action: "regional_summary_get",
      path: req.nextUrl.pathname,
      req,
    });
    return NextResponse.json({
      scope: regional.scope,
      villageCount: 0,
      villagesIncluded: 0,
      totals: {
        residents: 0,
        officials: 0,
        mailServices: 0,
        pendingMailRequests: 0,
      },
      villages: villages.map((v) => ({
        id: v.id,
        code: v.code,
        name: v.name,
        district: v.district,
        regency: v.regency,
        isActive: v.isActive,
        subscriptionActive: v.subscriptionActive,
        includedInAggregate: false,
      })),
    });
  }

  const [
    residents,
    officials,
    mailServices,
    pendingMailRequests,
  ] = await Promise.all([
    prisma.resident.count({ where: { villageId: { in: villageIds } } }),
    prisma.official.count({ where: { villageId: { in: villageIds } } }),
    prisma.mailService.count({ where: { villageId: { in: villageIds } } }),
    prisma.mailRequest.count({
      where: { villageId: { in: villageIds }, status: "pending" },
    }),
  ]);

  await logRegionalAccess({
    regionalUserId: regional.regionalUserId,
    action: "regional_summary_get",
    path: req.nextUrl.pathname,
    req,
  });

  return NextResponse.json({
    scope: regional.scope,
    villageCount: villages.filter((v) => v.isActive).length,
    villagesIncluded: villageIds.length,
    totals: {
      residents,
      officials,
      mailServices,
      pendingMailRequests,
    },
    villages: villages.map((v) => ({
      id: v.id,
      code: v.code,
      name: v.name,
      district: v.district,
      regency: v.regency,
      isActive: v.isActive,
      subscriptionActive: v.subscriptionActive,
      includedInAggregate: villageIds.includes(v.id),
    })),
  });
}
