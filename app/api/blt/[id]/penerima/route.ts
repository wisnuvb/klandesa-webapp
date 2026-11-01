import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { addBeneficiary } from "@/lib/blt/service";

/** Menambah keluarga penerima manfaat (hanya saat draf): { residentId, source, criteria?, category }. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/blt/[id]/penerima", "Gagal menambah penerima BLT", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Program BLT tidak ditemukan." }, { status: 404 });
    const body = await req.json().catch(() => null);
    const r = await addBeneficiary(prisma, { villageId: ctx.village.id, programId: id, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "blt_beneficiaries", r.data.id, { programId: id });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
