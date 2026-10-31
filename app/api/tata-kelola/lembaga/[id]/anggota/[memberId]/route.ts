import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { removeMember, updateMember } from "@/lib/tata-kelola/institutions";
import { failResponse, parseIntId } from "@/lib/tata-kelola/http";

type Ctx = { params: Promise<{ id: string; memberId: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const institutionId = parseIntId(p.id);
    const memberId = parseIntId(p.memberId);
    if (!institutionId || !memberId) return NextResponse.json({ error: "Anggota tidak ditemukan" }, { status: 404 });
    const r = await updateMember(prisma, { villageId: ctx.village.id, institutionId, memberId, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "institution_members", memberId, { institutionId });
    return NextResponse.json({ success: true, institution: r.data });
  } catch (e) {
    console.error("PATCH /api/tata-kelola/lembaga/[id]/anggota/[memberId] error:", e);
    return NextResponse.json({ error: "Gagal menyimpan perubahan" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const p = await params;
    const institutionId = parseIntId(p.id);
    const memberId = parseIntId(p.memberId);
    if (!institutionId || !memberId) return NextResponse.json({ error: "Anggota tidak ditemukan" }, { status: 404 });
    const r = await removeMember(prisma, { villageId: ctx.village.id, institutionId, memberId });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "institution_members", memberId, { institutionId });
    return NextResponse.json({ success: true, institution: r.data });
  } catch (e) {
    console.error("DELETE /api/tata-kelola/lembaga/[id]/anggota/[memberId] error:", e);
    return NextResponse.json({ error: "Gagal menghapus anggota" }, { status: 500 });
  }
}
