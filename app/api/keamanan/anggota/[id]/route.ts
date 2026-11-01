import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { AUDIT } from "@/lib/keamanan/http";
import { patchMember, removeMember } from "@/lib/keamanan/service";

type Ctx = { params: Promise<{ id: string }> };
const notFound = () => NextResponse.json({ error: "Anggota tidak ditemukan." }, { status: 404 });

export async function PATCH(req: NextRequest, { params }: Ctx) {
  return attempt("PATCH /api/keamanan/anggota/[id]", "Gagal menyimpan anggota", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await patchMember(prisma, { villageId: ctx.village.id, id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", AUDIT.member, id, { residentId: r.data.residentId, keys: r.data.keys });
    return NextResponse.json({ success: true });
  });
}

/** Menghapus catatan anggota yang salah input. Untuk anggota yang berhenti gunakan "akhiri" agar arsip tetap ada. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return attempt("DELETE /api/keamanan/anggota/[id]", "Gagal menghapus anggota", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return notFound();
    const r = await removeMember(prisma, { villageId: ctx.village.id, id });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", AUDIT.member, id, { residentId: r.data.residentId });
    return NextResponse.json({ success: true });
  });
}
