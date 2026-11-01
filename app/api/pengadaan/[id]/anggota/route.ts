import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { addMember } from "@/lib/pengadaan/service";

/** Menambah anggota TPK: { name, role, element, position? }. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/pengadaan/[id]/anggota", "Gagal menambah anggota TPK", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Paket pengadaan tidak ditemukan." }, { status: 404 });
    const r = await addMember(prisma, { villageId: ctx.village.id, packageId: id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "procurement_team_members", r.data.id, { packageId: id, name: r.data.name, role: r.data.role });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
