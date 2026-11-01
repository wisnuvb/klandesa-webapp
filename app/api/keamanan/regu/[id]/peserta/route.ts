import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { AUDIT } from "@/lib/keamanan/http";
import { addPerson } from "@/lib/keamanan/ronda";

type Ctx = { params: Promise<{ id: string }> };

/** Menambah peserta regu: { residentId, active?, joinedOn? }. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/keamanan/regu/[id]/peserta", "Gagal menambah peserta", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Regu tidak ditemukan." }, { status: 404 });
    const r = await addPerson(prisma, { villageId: ctx.village.id, groupId: id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", AUDIT.person, r.data.id, { groupId: id, residentId: r.data.residentId });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
