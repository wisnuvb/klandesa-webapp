import { NextRequest, NextResponse } from "next/server";
import { auditWeb } from "@/lib/audit/web-audit";
import { toCsv } from "@/lib/custom-data/schema";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { buildReport, isReportKind } from "@/lib/apbdes/report-data";
import { isMoreKind, loadMoreReport } from "@/lib/apbdes/report-more";
import { tableToCsvRows } from "@/lib/apbdes/tables";
import { failResponse, attempt, yearOf } from "@/lib/apbdes/http";

/** Laporan (?kind=bku|bank|pajak|semester1|realisasi|rincian|kegiatan|publik|rka|rab|rkk|rak|spp|ptjb|panjar|kegiatan-t3|sektoral|calk &year= &month= &activity= &id= &semester=1 &format=csv). */
export async function GET(req: NextRequest) {
  return attempt("GET /api/apbdes/laporan", "Gagal menyusun laporan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const sp = req.nextUrl.searchParams;
    const kind = sp.get("kind");
    if (!isReportKind(kind) && !isMoreKind(kind)) return NextResponse.json({ error: "Jenis laporan tidak dikenal" }, { status: 400 });
    const year = yearOf(sp.get("year"));
    const m = sp.get("month");
    const idRaw = Number(sp.get("id"));
    const r = isMoreKind(kind)
      ? await loadMoreReport(prisma, ctx.village.id, year, kind, { activityCode: sp.get("activity") ?? undefined, id: Number.isInteger(idRaw) && idRaw > 0 ? idRaw : undefined, semester: sp.get("semester") === "1" })
      : await buildReport(prisma, ctx.village.id, year, kind, m ? Number(m) : undefined);
    if (!r.ok) return failResponse(r);
    if (sp.get("format") === "csv") {
      await auditWeb(req, ctx, "export", "apbdes_laporan", kind, { year, month: m });
      const csv = toCsv(r.data.columns.map((c) => c.label), tableToCsvRows(r.data));
      return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${kind}-${year}.csv"` } });
    }
    return NextResponse.json({ report: r.data });
  });
}
