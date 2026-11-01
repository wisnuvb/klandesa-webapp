import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { AUDIT } from "@/lib/keamanan/http";
import { createFollowup } from "@/lib/keamanan/kejadian";

type Ctx = { params: Promise<{ id: string }> };

/** Menambah tindak lanjut: { description, dueOn?, assignee?, mediationId? }. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/keamanan/kejadian/[id]/tindak-lanjut", "Gagal mencatat tindak lanjut", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Kejadian tidak ditemukan." }, { status: 404 });
    const r = await createFollowup(prisma, { villageId: ctx.village.id, eventId: id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", AUDIT.followup, r.data.id, { eventId: id });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
