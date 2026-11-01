import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { addParty } from "@/lib/kerja-sama/service";

/** Menambah pihak: { kind: "DESA"|"PIHAK_KETIGA", name, representativeName?, representativeTitle? }. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/kerja-sama/[id]/pihak", "Gagal menambah pihak", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Kerja sama tidak ditemukan." }, { status: 404 });
    const r = await addParty(prisma, { villageId: ctx.village.id, agreementId: id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "village_agreements_parties", r.data.id, { agreementId: id, name: r.data.name, kind: r.data.kind });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
