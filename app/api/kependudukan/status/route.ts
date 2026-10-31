import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { healIfNeeded, isKependudukanV2, SETTINGS_NEEDS_RECONCILE } from "@/lib/kependudukan/sync";

/** Status fitur kependudukan v2 untuk desa ini (baca-saja): bendera, tanda butuh rekonsiliasi, ringkasan. */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { village } = guard.ctx;
    const enabled = isKependudukanV2(village.settings);
    const s = village.settings && typeof village.settings === "object" && !Array.isArray(village.settings) ? (village.settings as Record<string, unknown>) : {};
    if (!enabled) return NextResponse.json({ enabled: false, canActivate: guard.ctx.dbUser.role === "admin" });
    healIfNeeded(village); // pemulihan mandiri di latar belakang bila sinkronisasi pernah gagal

    const [households, withoutHead, units, pending] = await Promise.all([
      prisma.household.count({ where: { villageId: village.id, status: "ACTIVE" } }),
      prisma.household.count({ where: { villageId: village.id, status: "ACTIVE", headResidentId: null } }),
      prisma.wilayahUnit.groupBy({ by: ["type"], where: { villageId: village.id }, _count: { _all: true } }),
      prisma.residentMutation.count({ where: { villageId: village.id, status: "PENDING" } }),
    ]);
    return NextResponse.json({
      enabled: true,
      needsReconcileSince: typeof s[SETTINGS_NEEDS_RECONCILE] === "string" ? s[SETTINGS_NEEDS_RECONCILE] : null,
      households: { active: households, withoutHead },
      wilayah: Object.fromEntries(units.map((u) => [u.type, u._count._all])),
      pendingMutations: pending,
    });
  } catch (e) {
    console.error("GET /api/kependudukan/status error:", e);
    return NextResponse.json({ error: "Gagal memuat status" }, { status: 500 });
  }
}
