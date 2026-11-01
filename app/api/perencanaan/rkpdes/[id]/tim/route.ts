import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { addTeamMember } from "@/lib/rkpdes/service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/perencanaan/rkpdes/[id]/tim", "Gagal menambah anggota tim", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "RKP Desa tidak ditemukan." }, { status: 404 });
    const body = await req.json().catch(() => null);
    const r = await addTeamMember(prisma, { villageId: ctx.village.id, documentId: id, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "rkpdes_team_members", r.data.id, { documentId: id });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
