import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { addAttendees, addAttendeesBulk } from "@/lib/musdes/service";

/** Tambah peserta: satu orang (nama atau residentId) atau banyak nama sekaligus (`names`: string[] dengan satu `unsur`). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/musdes/[id]/peserta", "Gagal menambah peserta", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Musyawarah tidak ditemukan." }, { status: 404 });
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const r = Array.isArray(body?.names)
      ? await addAttendeesBulk(prisma, { villageId: ctx.village.id, meetingId: id, names: body.names, unsur: body.unsur, present: body.present === true })
      : await addAttendees(prisma, { villageId: ctx.village.id, meetingId: id, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "village_meeting_attendees", id, { added: r.data.added });
    return NextResponse.json({ success: true, added: r.data.added }, { status: 201 });
  });
}
