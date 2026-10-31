import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { deleteInstitution, updateInstitution } from "@/lib/tata-kelola/institutions";
import { failResponse, parseIntId } from "@/lib/tata-kelola/http";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Lembaga tidak ditemukan" }, { status: 404 });
    const r = await updateInstitution(prisma, { villageId: ctx.village.id, id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "village_institutions", id, { type: r.data.type, name: r.data.name });
    return NextResponse.json({ success: true, institution: r.data });
  } catch (e) {
    console.error("PATCH /api/tata-kelola/lembaga/[id] error:", e);
    return NextResponse.json({ error: "Gagal menyimpan perubahan" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Lembaga tidak ditemukan" }, { status: 404 });
    const r = await deleteInstitution(prisma, ctx.village.id, id);
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "village_institutions", id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/tata-kelola/lembaga/[id] error:", e);
    return NextResponse.json({ error: "Gagal menghapus lembaga" }, { status: 500 });
  }
}
