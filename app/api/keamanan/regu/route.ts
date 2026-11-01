import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse } from "@/lib/apbdes/http";
import { todayJakarta } from "@/lib/keamanan/calc";
import { AUDIT, hasDetail, keamananCan } from "@/lib/keamanan/http";
import { createGroup, listGroups } from "@/lib/keamanan/ronda";

/** Daftar regu ronda beserta pesertanya dan temuan (peserta kurang, jadwal kosong, dst.). */
export async function GET(req: NextRequest) {
  return attempt("GET /api/keamanan/regu", "Gagal memuat regu ronda", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const rows = await listGroups(prisma, { villageId: ctx.village.id, today: todayJakarta() });
    return NextResponse.json({ rows, can: keamananCan(ctx), detail: hasDetail(ctx), today: todayJakarta() });
  });
}

/** Membuat regu: { name, rt?, rw?, hamlet?, postName?, startTime?, endTime?, perShift?, active?, note? }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/keamanan/regu", "Gagal membuat regu ronda", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await createGroup(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", AUDIT.group, r.data.id, { name: r.data.name });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
