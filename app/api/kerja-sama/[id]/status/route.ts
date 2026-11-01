import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId } from "@/lib/apbdes/http";
import { transition } from "@/lib/kerja-sama/service";

/** Memindahkan tahap kerja sama: { to, reason? } atau { to: "SELESAI", endReason, endedOn, endNote? }. Penandatanganan memakai rute tersendiri. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/kerja-sama/[id]/status", "Gagal mengubah tahap kerja sama", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Kerja sama tidak ditemukan." }, { status: 404 });
    const body = await req.json().catch(() => null);
    const r = await transition(prisma, { villageId: ctx.village.id, id, body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "village_agreements", id, { transition: `${r.data.from} -> ${r.data.to}`, title: r.data.title });
    return NextResponse.json({ success: true, status: r.data.to });
  });
}
