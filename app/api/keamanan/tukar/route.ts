import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { todayJakarta } from "@/lib/keamanan/calc";
import { AUDIT, keamananCan } from "@/lib/keamanan/http";
import { createSwap, listSwaps } from "@/lib/keamanan/ronda";

/** Permintaan tukar/ganti giliran (?groupId=&status=PENDING|APPROVED|REJECTED|CANCELLED). */
export async function GET(req: NextRequest) {
  return attempt("GET /api/keamanan/tukar", "Gagal memuat permintaan tukar", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const q = req.nextUrl.searchParams;
    const rows = await listSwaps(prisma, { villageId: ctx.village.id, groupId: parseIntId(q.get("groupId") ?? ""), status: q.get("status") });
    return NextResponse.json({ rows, can: keamananCan(ctx) });
  });
}

/** Mengajukan tukar/ganti: { shiftId, counterpartResidentId, counterpartShiftId?, counterpartAgreed, reason? }. Berlaku setelah diputuskan. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/keamanan/tukar", "Gagal mengajukan tukar giliran", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await createSwap(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null), today: todayJakarta() });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", AUDIT.swap, r.data.id, { groupId: r.data.groupId, shiftId: r.data.shiftId });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
