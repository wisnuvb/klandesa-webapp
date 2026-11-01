import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId, permissions } from "@/lib/apbdes/http";
import { replaceBeneficiary } from "@/lib/blt/service";

/**
 * Mengganti penerima yang meninggal atau tidak lagi memenuhi kriteria, berdasar Musyawarah Desa khusus (Lampiran II.A.2.d):
 * { meetingId, reason, decreeRef?, replacement?: { residentId, source, criteria?, category } }. Tanpa `replacement` = berakhir tanpa pengganti.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; bid: string }> }) {
  return attempt("POST /api/blt/[id]/penerima/[bid]/ganti", "Gagal mengganti penerima BLT", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx, "blt").delete) return forbidden("Penggantian penerima hanya dapat dilakukan oleh sekretaris atau admin.");
    const p = await params;
    const id = parseIntId(p.id);
    const bid = parseIntId(p.bid);
    if (!id || !bid) return NextResponse.json({ error: "Penerima tidak ditemukan." }, { status: 404 });
    const body = await req.json().catch(() => null);
    const r = await replaceBeneficiary(prisma, { villageId: ctx.village.id, programId: id, id: bid, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "blt_beneficiaries", bid, { programId: id, replacedBy: r.data.id, reason: String((body as { reason?: unknown })?.reason ?? "").slice(0, 300) });
    return NextResponse.json({ success: true, id: r.data.id });
  });
}
