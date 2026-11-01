import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { normalizeVillageRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId } from "@/lib/apbdes/http";
import { actOnRequest } from "@/lib/apbdes/spp";

/** Verifikasi Sekretaris Desa (verify), pembayaran Kaur Keuangan (pay: { paidAt, channel }). Persetujuan dan penolakan Kepala Desa lewat /spp/persetujuan. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/apbdes/spp/[id]/aksi", "Gagal memproses SPP", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "SPP tidak ditemukan" }, { status: 404 });
    const body = (await req.json().catch(() => null)) as { action?: unknown } | null;
    const action = body?.action;
    if (action !== "verify" && action !== "pay" && action !== "reject") return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
    const staff = normalizeVillageRole(ctx.dbUser.role) === "staff";
    if ((action === "verify" || action === "reject") && staff) return forbidden("Verifikasi atau penolakan SPP dilakukan Sekretaris Desa");
    const r = await actOnRequest(prisma, { villageId: ctx.village.id, userId: ctx.userId, requestId: id, action, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "apbdes_pay_requests", id, { action });
    return NextResponse.json({ success: true, status: r.data.status });
  });
}
