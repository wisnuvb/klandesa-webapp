import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { rulesFor } from "@/lib/dana-desa/rules";
import { attempt, failResponse, permissions, yearOf } from "@/lib/apbdes/http";
import { createActivity, listActivities } from "@/lib/pktd/service";

/** Daftar kegiatan Padat Karya Tunai Desa satu tahun (?year=). */
export async function GET(req: NextRequest) {
  return attempt("GET /api/pktd", "Gagal memuat PKTD", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const year = yearOf(req.nextUrl.searchParams.get("year"));
    return NextResponse.json({ year, activities: await listActivities(prisma, ctx.village.id, year), minPct: rulesFor(year).rules.pktdWageMinPct, can: permissions(ctx) });
  });
}

/** Membuat kegiatan PKTD: { year, title, cost, plannedWage?, activityCode?, location?, startDate?, endDate? }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/pktd", "Gagal membuat kegiatan PKTD", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const r = await createActivity(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "pktd_activities", r.data.id);
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
