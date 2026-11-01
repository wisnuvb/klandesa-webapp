import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId, permissions } from "@/lib/apbdes/http";
import { requestActivitySpp } from "@/lib/pktd/service";

type Ctx = { params: Promise<{ id: string }> };

/** Mengajukan SPP untuk membiayai upah PKTD: { activityCode, accountCode, amount, executorName, workPeriod? }. Perlu izin mencatat di keuangan desa. */
export async function POST(req: NextRequest, { params }: Ctx) {
  return attempt("POST /api/pktd/[id]/spp", "Gagal mengajukan SPP", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx, "apbdes").create) return forbidden("Anda tidak berwenang mengajukan SPP.");
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Kegiatan PKTD tidak ditemukan." }, { status: 404 });
    const body = await req.json().catch(() => null);
    const r = await requestActivitySpp(prisma, { villageId: ctx.village.id, activityId: id, userId: ctx.userId ?? null, input: body });
    if (!r.ok) return failResponse(r);
    const b = (body ?? {}) as Record<string, unknown>;
    await auditWeb(req, ctx, "create", "apbdes_pay_requests", r.data.id, { source: "PKTD", activityId: id, number: r.data.number, amount: r.data.amount, activityCode: b.activityCode, accountCode: b.accountCode });
    return NextResponse.json({ success: true, id: r.data.id, number: r.data.number }, { status: 201 });
  });
}
