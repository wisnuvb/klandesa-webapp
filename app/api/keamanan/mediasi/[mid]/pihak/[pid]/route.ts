import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { AUDIT } from "@/lib/keamanan/http";
import { patchParty, removeParty } from "@/lib/keamanan/kejadian";

type Ctx = { params: Promise<{ mid: string; pid: string }> };

/** Mengubah kehadiran/persetujuan/catatan/peran pihak: { attended?, agrees?, note?, side? }. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/keamanan/mediasi/[mid]/pihak/[pid]", "Gagal menyimpan pihak", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const mid = parseIntId(p.mid);
    const pid = parseIntId(p.pid);
    if (!mid || !pid) return NextResponse.json({ error: "Pihak tidak ditemukan." }, { status: 404 });
    const r = await patchParty(prisma, { villageId: ctx.village.id, mediationId: mid, id: pid, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", AUDIT.party, pid, { mediationId: mid, eventId: r.data.eventId, keys: r.data.keys });
    return NextResponse.json({ success: true });
  });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/keamanan/mediasi/[mid]/pihak/[pid]", "Gagal menghapus pihak", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const mid = parseIntId(p.mid);
    const pid = parseIntId(p.pid);
    if (!mid || !pid) return NextResponse.json({ error: "Pihak tidak ditemukan." }, { status: 404 });
    const r = await removeParty(prisma, { villageId: ctx.village.id, mediationId: mid, id: pid });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", AUDIT.party, pid, { mediationId: mid, eventId: r.data.eventId });
    return NextResponse.json({ success: true });
  });
}
