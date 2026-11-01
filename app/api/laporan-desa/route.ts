import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, permissions, yearOf } from "@/lib/apbdes/http";
import { KINDS, KIND_INFO, SECTIONS, isReportKind } from "@/lib/laporan-desa/catalog";
import { getReport, saveReport } from "@/lib/laporan-desa/service";

/** Laporan Kepala Desa (?kind=LPPD_TAHUN|LKPPD|LPPD_JABATAN&year=): bagian naratif, status, tenggat, dan definisi bagian. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/laporan-desa", "Gagal memuat laporan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const sp = req.nextUrl.searchParams;
    const kind = sp.get("kind");
    if (!isReportKind(kind)) return NextResponse.json({ error: "Jenis laporan tidak dikenal" }, { status: 400 });
    const r = await getReport(prisma, ctx.village.id, kind, yearOf(sp.get("year")));
    if (!r.ok) return failResponse(r);
    return NextResponse.json({ report: r.data, kinds: KINDS, info: KIND_INFO[kind], sections: SECTIONS[kind], can: permissions(ctx) });
  });
}

/** Menyimpan bagian naratif: ?kind=&year= dengan badan { sections: { id: teks } }. */
export async function PUT(req: NextRequest) {
  return attempt("PUT /api/laporan-desa", "Gagal menyimpan laporan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const sp = req.nextUrl.searchParams;
    const kind = sp.get("kind");
    if (!isReportKind(kind)) return NextResponse.json({ error: "Jenis laporan tidak dikenal" }, { status: 400 });
    const year = yearOf(sp.get("year"), 0);
    const r = await saveReport(prisma, { villageId: ctx.village.id, userId: ctx.userId, kind, year, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "village_reports", `${kind}-${year}`, { saved: r.data.saved });
    return NextResponse.json({ success: true, saved: r.data.saved });
  });
}
