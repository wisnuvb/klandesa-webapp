import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { AUDIT, denyUnless } from "@/lib/keamanan/http";
import { endMember } from "@/lib/keamanan/service";

type Ctx = { params: Promise<{ id: string }> };

/** Mengakhiri keanggotaan: { endedOn, endReason, endDecree? } (Permendagri 26/2020 Pasal 25). */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/keamanan/anggota/[id]/akhiri", "Gagal mengakhiri keanggotaan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const denied = denyUnless(ctx, "update");
    if (denied) return denied;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Anggota tidak ditemukan." }, { status: 404 });
    const r = await endMember(prisma, { villageId: ctx.village.id, id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "end", AUDIT.member, id, { residentId: r.data.residentId, endReason: r.data.endReason });
    return NextResponse.json({ success: true });
  });
}
