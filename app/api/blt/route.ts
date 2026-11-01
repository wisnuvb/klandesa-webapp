import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { fromCents } from "@/lib/coop/loan-math";
import { rulesFor } from "@/lib/dana-desa/rules";
import { attempt, failResponse, permissions } from "@/lib/apbdes/http";
import { createProgram, listPrograms } from "@/lib/blt/service";

/** Daftar program BLT Desa per tahun. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/blt", "Gagal memuat BLT Desa", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const year = new Date().getUTCFullYear();
    const { rules } = rulesFor(year);
    return NextResponse.json({ programs: await listPrograms(prisma, ctx.village.id), can: permissions(ctx, "blt"), defaults: { year, monthlyMax: fromCents(rules.bltMaxMonthlyCents), monthsAtOnce: rules.bltMaxMonthsAtOnce } });
  });
}

/** Membuat program BLT satu tahun: { year, title, monthly, totalMonths }. */
export async function POST(req: NextRequest) {
  return attempt("POST /api/blt", "Gagal membuat program BLT", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = await req.json().catch(() => null);
    const r = await createProgram(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "blt_programs", r.data.id, { year: (body as { year?: unknown })?.year });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
