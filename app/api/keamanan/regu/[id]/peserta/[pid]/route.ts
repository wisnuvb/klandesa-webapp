import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { todayJakarta } from "@/lib/keamanan/calc";
import { AUDIT } from "@/lib/keamanan/http";
import { patchPerson, removePerson } from "@/lib/keamanan/ronda";

type Ctx = { params: Promise<{ id: string; pid: string }> };

/** Mengaktifkan/menonaktifkan peserta. Menonaktifkan tidak menghapus giliran yang sudah dijadwalkan; jumlahnya dikembalikan sebagai peringatan. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/keamanan/regu/[id]/peserta/[pid]", "Gagal menyimpan peserta", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const id = parseIntId(p.id);
    const pid = parseIntId(p.pid);
    if (!id || !pid) return NextResponse.json({ error: "Peserta tidak ditemukan." }, { status: 404 });
    const r = await patchPerson(prisma, { villageId: ctx.village.id, groupId: id, id: pid, input: await req.json().catch(() => null), today: todayJakarta() });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", AUDIT.person, pid, { groupId: id, residentId: r.data.residentId });
    return NextResponse.json({ success: true, futureShifts: r.data.futureShifts });
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/keamanan/regu/[id]/peserta/[pid]", "Gagal menghapus peserta", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const id = parseIntId(p.id);
    const pid = parseIntId(p.pid);
    if (!id || !pid) return NextResponse.json({ error: "Peserta tidak ditemukan." }, { status: 404 });
    const r = await removePerson(prisma, { villageId: ctx.village.id, groupId: id, id: pid });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", AUDIT.person, pid, { groupId: id, residentId: r.data.residentId });
    return NextResponse.json({ success: true });
  });
}
