import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { AUDIT, keamananCan } from "@/lib/keamanan/http";
import { transitionSecurity } from "@/lib/keamanan/kejadian";

type Ctx = { params: Promise<{ id: string }> };

/** Memindah status: { to, note? }. Menutup/membuka kembali butuh izin approve (dicek di dalam kunci kejadian). */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/keamanan/kejadian/[id]/status", "Gagal mengubah status kejadian", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Kejadian tidak ditemukan." }, { status: 404 });
    const can = keamananCan(ctx);
    const r = await transitionSecurity(prisma, { villageId: ctx.village.id, id, userId: ctx.userId ?? null, input: await req.json().catch(() => null), can: { update: can.update, approve: can.approve } });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "status", AUDIT.event, id, { from: r.data.from, to: r.data.to });
    return NextResponse.json({ success: true, ...r.data });
  });
}
