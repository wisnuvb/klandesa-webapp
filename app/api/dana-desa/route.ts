import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, parseIntId, permissions, yearOf } from "@/lib/apbdes/http";
import { getOverview, saveYearSetting } from "@/lib/dana-desa/service";

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Ringkasan kepatuhan Dana Desa satu tahun (?year=, ?apbdes=<id dokumen>, default dokumen APB Desa terbaru). */
export async function GET(req: NextRequest) {
  return attempt("GET /api/dana-desa", "Gagal memuat Dana Desa", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const year = yearOf(req.nextUrl.searchParams.get("year"));
    const raw = req.nextUrl.searchParams.get("apbdes");
    const apbdesId = raw ? parseIntId(raw) : null;
    if (raw && !apbdesId) return NextResponse.json({ error: "Dokumen APB Desa tidak valid." }, { status: 400 });
    const r = await getOverview(prisma, { villageId: ctx.village.id, year, apbdesId, today: todayIso() });
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ ...r.data, village: { name: ctx.village.name }, can: permissions(ctx) });
  });
}

/** Menyimpan pagu dan tanggal laporan tahun itu (sebagian kolom): { year, regular, kdmp, isMandiri, focusReportedOn, prevYearReportedOn, stage1ReportedOn, note }. */
export async function PUT(req: NextRequest) {
  return attempt("PUT /api/dana-desa", "Gagal menyimpan pengaturan Dana Desa", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = (await req.json().catch(() => null)) as { year?: unknown } | null;
    const year = yearOf(body?.year, 0);
    const r = await saveYearSetting(prisma, { villageId: ctx.village.id, year, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "dd_year_settings", r.data.id, { year, keys: Object.keys(body ?? {}).filter((k) => k !== "year") });
    return NextResponse.json({ success: true });
  });
}
