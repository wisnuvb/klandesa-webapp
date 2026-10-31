import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { bookCsv } from "@/lib/aset-desa/book";
import { bookForYear, disposedInYear } from "@/lib/aset-desa/service";

/**
 * Buku Inventaris Aset Desa untuk satu tahun (?year=2026): JSON untuk layar cetak, atau CSV (?format=csv).
 * Memuat daftar barang yang dihapus pada tahun itu untuk lampiran SK penghapusan.
 */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const sp = req.nextUrl.searchParams;
    const thisYear = new Date().getUTCFullYear();
    const year = Number(sp.get("year") ?? thisYear);
    if (!Number.isInteger(year) || year < 1900 || year > thisYear) return NextResponse.json({ error: "Tahun tidak valid" }, { status: 400 });

    const [items, disposed] = await Promise.all([bookForYear(prisma, ctx.village.id, year), disposedInYear(prisma, ctx.village.id, year)]);
    await auditWeb(req, ctx, "export", "inventory_items", `book-${year}`, { year, rows: items.length, format: sp.get("format") === "csv" ? "csv" : "json" });

    if (sp.get("format") === "csv") {
      return new NextResponse(bookCsv(items), {
        headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="buku-inventaris-aset-desa-${year}.csv"`, "Cache-Control": "no-store" },
      });
    }
    return NextResponse.json({ year, village: { name: ctx.village.name }, items, disposed }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("GET /api/aset-desa/buku error:", e);
    return NextResponse.json({ error: "Gagal memuat buku inventaris" }, { status: 500 });
  }
}
