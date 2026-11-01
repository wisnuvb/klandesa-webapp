import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { auditWeb } from "@/lib/audit/web-audit";
import { toCsv } from "@/lib/custom-data/schema";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { safeSheetName, slugifyFile } from "@/lib/statistics/export";
import {
  DIMENSIONS,
  RESIDENT_EXPORT_HEADER,
  RESIDENT_SELECT,
  filterResidents,
  residentExportRow,
  type ResidentDb,
} from "@/lib/statistics/residents-by-category";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Unduh seluruh daftar penduduk pada satu kategori statistik (Excel/CSV). Memuat NIK, jadi izinnya
 * `residents.export` (lihat api-route-map) dan setiap unduhan dicatat di jejak audit.
 */
export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, userId } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);

    const sp = req.nextUrl.searchParams;
    const dimension = sp.get("dimension")?.trim() ?? "";
    const category = sp.get("category")?.trim() ?? "";
    const format = sp.get("format") === "csv" ? "csv" : "excel";

    if (!DIMENSIONS.has(dimension)) {
      return NextResponse.json({ error: "Parameter dimension tidak valid" }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: "Parameter category wajib" }, { status: 400 });
    }

    const residents = await prisma.resident.findMany({
      where: { villageId: village.id, isAlive: true },
      select: RESIDENT_SELECT,
    });
    const rows = filterResidents(residents as ResidentDb[], {
      dimension,
      category,
      gender: sp.get("gender") ?? "",
      sortKey: "name",
    }).map((r, i) => residentExportRow(r, i + 1));

    if (rows.length === 0) {
      return NextResponse.json({ error: "Tidak ada penduduk untuk diekspor" }, { status: 404 });
    }

    await auditWeb(req, { userId, village }, "export", "statistics_residents", `${dimension}:${category}`.slice(0, 100), {
      rows: rows.length,
      dimension,
      category,
      format,
    });

    const base = `penduduk-${slugifyFile(category, dimension)}-${new Date().toISOString().slice(0, 10)}`;
    const noStore = { "Cache-Control": "no-store" };

    if (format === "csv") {
      return new NextResponse(toCsv(RESIDENT_EXPORT_HEADER, rows), {
        headers: {
          ...noStore,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${base}.csv"`,
        },
      });
    }

    const sheet = XLSX.utils.aoa_to_sheet([[...RESIDENT_EXPORT_HEADER], ...rows]);
    sheet["!cols"] = RESIDENT_EXPORT_HEADER.map((h, i) => ({
      wch: Math.min(40, Math.max(h.length, ...rows.map((r) => String(r[i]).length)) + 2),
    }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, safeSheetName(category, "Penduduk"));
    const buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;

    // Uint8Array, bukan buffer.toString(): mengubah biner ke teks merusak berkas .xlsx.
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        ...noStore,
        "Content-Type": XLSX_TYPE,
        "Content-Disposition": `attachment; filename="${base}.xlsx"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("GET /api/statistics/residents-by-category/export:", error);
    return NextResponse.json({ error: "Gagal mengekspor data penduduk" }, { status: 500 });
  }
}
