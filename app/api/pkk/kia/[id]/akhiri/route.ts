import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId, permissions } from "@/lib/apbdes/http";
import { isSubscriptionBlocked } from "@/lib/gizi/guard";
import { endPregnancy } from "@/lib/kia/service";

/** Akhiri kehamilan: { status: "BERSALIN" | "KEGUGURAN", endedAt, endNote? }. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/pkk/kia/[id]/akhiri", "Gagal mengakhiri kehamilan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx, "pkk").update) return forbidden("Anda tidak berwenang mengubah catatan kehamilan");
    const blocked = isSubscriptionBlocked(ctx.village);
    if (blocked) return blocked;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Catatan tidak ditemukan" }, { status: 404 });
    const body = (await req.json().catch(() => null)) as { status?: unknown } | null;
    const r = await endPregnancy(prisma, { villageId: ctx.village.id, pregnancyId: id, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "pregnancies", id, { status: body?.status });
    return NextResponse.json({ success: true });
  });
}
