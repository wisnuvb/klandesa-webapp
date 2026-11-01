import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { todayJakarta } from "@/lib/keamanan/calc";
import { AUDIT, denyUnless } from "@/lib/keamanan/http";
import { markAttendance } from "@/lib/keamanan/ronda";

type Ctx = { params: Promise<{ sid: string }> };

/** Mencatat kehadiran ronda: { attendance: PRESENT|LATE|ABSENT|EXCUSED|PENDING, attendanceNote? }. Hanya malam hari ini atau sebelumnya. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/keamanan/jadwal/[sid]/kehadiran", "Gagal mencatat kehadiran", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const denied = denyUnless(ctx, "update");
    if (denied) return denied;
    const id = parseIntId((await params).sid);
    if (!id) return NextResponse.json({ error: "Giliran tidak ditemukan." }, { status: 404 });
    const r = await markAttendance(prisma, { villageId: ctx.village.id, id, userId: ctx.userId ?? null, input: await req.json().catch(() => null), today: todayJakarta() });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "attendance", AUDIT.shift, id, { groupId: r.data.groupId, date: r.data.date, from: r.data.previous, to: r.data.attendance });
    return NextResponse.json({ success: true });
  });
}
