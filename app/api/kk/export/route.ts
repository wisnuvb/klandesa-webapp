import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { auditWeb } from "@/lib/audit/web-audit";
import { canVillageUser } from "@/lib/permissions/can";
import { toCsv } from "@/lib/custom-data/schema";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { parseKkQuery } from "@/lib/kependudukan/kk-list";
import { listKk } from "@/lib/kependudukan/kk-list-service";
import { KK_EXPORT_HEADER, KK_EXPORT_MAX_ROWS, kkExportAuditFilters, kkExportRow } from "@/lib/kependudukan/kk-export";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Unduh daftar KK sesuai filter, urutan, dan pencarian yang sedang tampil (Excel atau CSV).
 * Memuat nomor KK lengkap, jadi izinnya `residents.export` (admin; lihat api-route-map) dan setiap unduhan dicatat di audit.
 */
export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, userId, session } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);
    // Pagar kedua: peta izin API sudah menolak, ini menjaga bila peta berubah.
    if (!canVillageUser(session, "residents", "export")) {
      return NextResponse.json({ error: "Hanya admin yang boleh mengekspor daftar KK." }, { status: 403 });
    }

    const sp = req.nextUrl.searchParams;
    const format = sp.get("format") === "csv" ? "csv" : "excel";
    const query = { ...parseKkQuery(sp), page: 1, pageSize: KK_EXPORT_MAX_ROWS };

    const { rows: agg, total } = await listKk(prisma, { villageId: village.id, query });
    if (agg.length === 0) return NextResponse.json({ error: "Tidak ada KK untuk diekspor" }, { status: 404 });

    const rows = agg.map((r, i) => kkExportRow(r, i + 1));
    await auditWeb(req, { userId, village }, "export", "kk_list", new Date().toISOString().slice(0, 10), {
      rows: rows.length,
      total,
      format,
      filters: kkExportAuditFilters(query),
    });

    const base = `daftar-kk-${new Date().toISOString().slice(0, 10)}`;
    const noStore = { "Cache-Control": "no-store" };

    if (format === "csv") {
      return new NextResponse(toCsv(KK_EXPORT_HEADER, rows), {
        headers: { ...noStore, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${base}.csv"` },
      });
    }

    const sheet = XLSX.utils.aoa_to_sheet([[...KK_EXPORT_HEADER], ...rows]);
    sheet["!cols"] = KK_EXPORT_HEADER.map((h, i) => ({ wch: Math.min(40, Math.max(h.length, ...rows.slice(0, 500).map((r) => String(r[i]).length)) + 2) }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Daftar KK");
    const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
    // Uint8Array, bukan buffer.toString(): mengubah biner ke teks merusak berkas .xlsx.
    return new NextResponse(new Uint8Array(buffer), {
      headers: { ...noStore, "Content-Type": XLSX_TYPE, "Content-Disposition": `attachment; filename="${base}.xlsx"`, "Content-Length": String(buffer.length) },
    });
  } catch (err) {
    console.error("GET /api/kk/export error:", err);
    return NextResponse.json({ error: "Gagal mengekspor daftar KK" }, { status: 500 });
  }
}
