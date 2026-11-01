import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { parseIsoDate } from "@/lib/form-input";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId, permissions } from "@/lib/apbdes/http";
import { rpjmdesGate } from "@/lib/rpjm/http";
import { approveDraft } from "@/lib/rpjm/service";

/**
 * Kepala Desa menyetujui (atau mencabut persetujuan atas) rancangan RPJM Desa (Permendagri 114/2014 Pasal 24).
 * Rutenya POST (dipetakan "approve" lewat pola), izin dicek ulang di sini.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/perencanaan/rpjm/[id]/persetujuan", "Gagal memproses persetujuan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx, "perencanaan").approve) return forbidden("Hanya Kepala Desa atau admin yang dapat menyetujui rancangan RPJM Desa.");
    const denied = rpjmdesGate(ctx, "approve");
    if (denied) return denied;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "RPJM Desa tidak ditemukan." }, { status: 404 });
    const body = (await req.json().catch(() => null)) as { revoke?: boolean; date?: unknown } | null;
    const revoke = body?.revoke === true;
    const date = revoke ? null : body?.date ? parseIsoDate(body.date) : new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
    if (!revoke && !date) return NextResponse.json({ error: "Tanggal persetujuan tidak valid.", fieldErrors: { date: "Tanggal tidak valid." } }, { status: 400 });
    const r = await approveDraft(prisma, { villageId: ctx.village.id, id, userId: ctx.userId ?? null, date });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "approve", "rpjmdes_plans", id, { revoke });
    return NextResponse.json({ success: true });
  });
}
