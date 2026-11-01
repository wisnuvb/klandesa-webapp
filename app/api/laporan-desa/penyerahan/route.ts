import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, yearOf } from "@/lib/apbdes/http";
import { isReportKind } from "@/lib/laporan-desa/catalog";
import { reopenReport, submitReport } from "@/lib/laporan-desa/service";

/** Kepala Desa menandai laporan diserahkan ({ kind, year, action: "submit", submittedAt, note? }) atau membukanya kembali ({ action: "reopen" }). */
export async function POST(req: NextRequest) {
  return attempt("POST /api/laporan-desa/penyerahan", "Gagal memproses penyerahan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = (await req.json().catch(() => null)) as { kind?: unknown; year?: unknown; action?: unknown } | null;
    if (!isReportKind(body?.kind)) return NextResponse.json({ error: "Jenis laporan tidak dikenal" }, { status: 400 });
    const year = yearOf(body?.year, 0);
    if (body?.action !== "submit" && body?.action !== "reopen") return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
    const r = body.action === "submit" ? await submitReport(prisma, { villageId: ctx.village.id, kind: body.kind, year, input: body }) : await reopenReport(prisma, { villageId: ctx.village.id, kind: body.kind, year });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "village_reports", `${body.kind}-${year}`, { action: body.action });
    return NextResponse.json({ success: true });
  });
}
