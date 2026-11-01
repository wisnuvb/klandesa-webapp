import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { AUDIT, hasDetail, keamananCan } from "@/lib/keamanan/http";
import { createEquipment, listEquipment } from "@/lib/keamanan/service";
import { CONDITIONS, EQUIPMENT_CATEGORIES } from "@/lib/keamanan/catalog";

/** Daftar perlengkapan Satlinmas. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/keamanan/perlengkapan", "Gagal memuat perlengkapan Satlinmas", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const list = await listEquipment(prisma, { villageId: ctx.village.id });
    return NextResponse.json({ ...list, categories: EQUIPMENT_CATEGORIES, conditions: CONDITIONS, can: keamananCan(ctx), detail: hasDetail(ctx) });
  });
}

export async function POST(req: NextRequest) {
  return attempt("POST /api/keamanan/perlengkapan", "Gagal menyimpan perlengkapan Satlinmas", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await createEquipment(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", AUDIT.equipment, r.data.id, { category: r.data.category });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
