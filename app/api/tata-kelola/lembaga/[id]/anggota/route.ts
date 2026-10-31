import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { addMember } from "@/lib/tata-kelola/institutions";
import { failResponse, parseIntId } from "@/lib/tata-kelola/http";

type Ctx = { params: Promise<{ id: string }> };

/** Tambah anggota: { name?, residentId?, role, division?, startsAt?, endsAt? }. */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Lembaga tidak ditemukan" }, { status: 404 });
    const r = await addMember(prisma, { villageId: ctx.village.id, institutionId: id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "institution_members", id, { institutionId: id });
    return NextResponse.json({ success: true, institution: r.data }, { status: 201 });
  } catch (e) {
    console.error("POST /api/tata-kelola/lembaga/[id]/anggota error:", e);
    return NextResponse.json({ error: "Gagal menambah anggota" }, { status: 500 });
  }
}
