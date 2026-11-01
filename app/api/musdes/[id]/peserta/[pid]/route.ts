import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { removeAttendee, updateAttendee } from "@/lib/musdes/service";

type Ctx = { params: Promise<{ id: string; pid: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/musdes/[id]/peserta/[pid]", "Gagal menyimpan peserta", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const meetingId = parseIntId(p.id);
    const attendeeId = parseIntId(p.pid);
    if (!meetingId || !attendeeId) return NextResponse.json({ error: "Peserta tidak ditemukan." }, { status: 404 });
    const body = await req.json().catch(() => null);
    const r = await updateAttendee(prisma, { villageId: ctx.village.id, meetingId, attendeeId, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "village_meeting_attendees", attendeeId, { meetingId });
    return NextResponse.json({ success: true });
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/musdes/[id]/peserta/[pid]", "Gagal menghapus peserta", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const meetingId = parseIntId(p.id);
    const attendeeId = parseIntId(p.pid);
    if (!meetingId || !attendeeId) return NextResponse.json({ error: "Peserta tidak ditemukan." }, { status: 404 });
    const r = await removeAttendee(prisma, { villageId: ctx.village.id, meetingId, attendeeId });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "village_meeting_attendees", attendeeId, { meetingId });
    return NextResponse.json({ success: true });
  });
}
