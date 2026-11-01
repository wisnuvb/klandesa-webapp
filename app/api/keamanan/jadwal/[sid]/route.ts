import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { todayJakarta } from "@/lib/keamanan/calc";
import { AUDIT } from "@/lib/keamanan/http";
import { removeShift } from "@/lib/keamanan/ronda";

type Ctx = { params: Promise<{ sid: string }> };

/** Menghapus satu giliran mendatang yang belum dicatat kehadirannya. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/keamanan/jadwal/[sid]", "Gagal menghapus giliran", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).sid);
    if (!id) return NextResponse.json({ error: "Giliran tidak ditemukan." }, { status: 404 });
    const r = await removeShift(prisma, { villageId: ctx.village.id, id, today: todayJakarta() });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", AUDIT.shift, id, { groupId: r.data.groupId, date: r.data.date, residentId: r.data.residentId });
    return NextResponse.json({ success: true });
  });
}
