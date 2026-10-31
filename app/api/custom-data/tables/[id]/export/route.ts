import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { exportCsv, getTable } from "@/lib/custom-data/service";
import { parseIntId } from "@/lib/custom-data/http";

/** Unduh seluruh baris tabel sebagai CSV (rumus spreadsheet dinetralkan). Pengunduhan tercatat di jejak audit. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (id == null) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    const table = await getTable(prisma, ctx.village.id, { id });
    if (!table) return NextResponse.json({ error: "Tabel tidak ditemukan" }, { status: 404 });

    const csv = await exportCsv(prisma, ctx.village.id, table);
    await auditWeb(req, ctx, "export", "custom_tables", id, { rows: table.recordCount });
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${table.slug}.csv"`, "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("GET /api/custom-data/tables/[id]/export error:", e);
    return NextResponse.json({ error: "Gagal mengunduh data" }, { status: 500 });
  }
}
