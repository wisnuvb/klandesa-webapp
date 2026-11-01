import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { AUDIT } from "@/lib/bencana/http";
import { addLogistic } from "@/lib/incident/service";

type Ctx = { params: Promise<{ id: string }> };

/** Mencatat distribusi bantuan: { householdId | recipientName, item, quantity, unit, fundingSource, distributedOn, value?, reference?, note? }. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/bencana/kejadian/[id]/logistik", "Gagal mencatat distribusi bantuan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Kejadian tidak ditemukan." }, { status: 404 });
    const r = await addLogistic(prisma, { domain: "BENCANA", villageId: ctx.village.id, id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    // Detail audit tanpa nama/KK: cukup rujukan kejadian dan barang.
    await auditWeb(req, ctx, "create", AUDIT.logistic, r.data.id, { eventId: id, item: r.data.item, quantity: r.data.quantity, household: r.data.householdId !== null });
    return NextResponse.json({ success: true, id: r.data.id, warnings: r.data.warnings }, { status: 201 });
  });
}
