import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, permissions, yearOf } from "@/lib/apbdes/http";
import { createRequest, listRequests } from "@/lib/apbdes/spp";
import { MODES, SPP_STATUS } from "@/lib/apbdes/catalog";

/** Daftar SPP satu tahun (?year=) dengan angka pagu, pencairan lalu, dan sisa dana (Lampiran M.1). */
export async function GET(req: NextRequest) {
  return attempt("GET /api/apbdes/spp", "Gagal memuat SPP", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const year = yearOf(req.nextUrl.searchParams.get("year"));
    return NextResponse.json({ year, requests: await listRequests(prisma, ctx.village.id, year), terms: { status: SPP_STATUS, modes: MODES }, can: permissions(ctx) });
  });
}

/** Mengajukan SPP: { year, activityCode, mode, executorName?, workPeriod?, hasReceipt?, lines: [{ accountCode, description?, payee?, amount, taxAmount?, taxKind? }] }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/apbdes/spp", "Gagal mengajukan SPP", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = (await req.json().catch(() => null)) as { year?: unknown } | null;
    const r = await createRequest(prisma, { villageId: ctx.village.id, userId: ctx.userId, year: yearOf(body?.year, 0), input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "apbdes_pay_requests", r.data.id, { number: r.data.number });
    return NextResponse.json({ success: true, id: r.data.id, number: r.data.number }, { status: 201 });
  });
}
