import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { auditPlatform } from "@/lib/platform/audit";
import {
  buildInvoiceCsv, INVOICE_EXPORT_MAX_ROWS, invoiceListSelect, invoiceListWhere, parseInvoiceQuery, toInvoiceListItem,
} from "@/lib/platform/metrics/invoices";
import { wibDayKey } from "@/lib/platform/metrics/period";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/revenue/export?status=&q=&range=  -> CSV tagihan (maks 5.000 baris, terbaru dulu).
 * Aman rumus spreadsheet (lib/csv-safe). Setiap ekspor dicatat ke jejak audit (`revenue.export`). Tanpa data pribadi warga/email.
 */
export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const parsed = parseInvoiceQuery(req.nextUrl.searchParams);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const query = parsed.value;
  const now = new Date();

  let items;
  try {
    const rows = await prisma.billingInvoice.findMany({
      where: invoiceListWhere(query, now),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: INVOICE_EXPORT_MAX_ROWS + 1,
      select: invoiceListSelect,
    });
    items = rows.map((r) => toInvoiceListItem(r, now));
  } catch (err) {
    logger.error({ err }, "[admin/revenue/export] gagal membaca tagihan");
    return NextResponse.json({ error: "Ekspor belum bisa dibuat. Coba lagi sebentar lagi." }, { status: 500 });
  }

  const truncated = items.length > INVOICE_EXPORT_MAX_ROWS;
  if (truncated) items = items.slice(0, INVOICE_EXPORT_MAX_ROWS);

  await auditPlatform(req, { platformUserId: auth.admin.platformUserId, email: auth.admin.email }, {
    action: "revenue.export",
    targetType: "system",
    summary: `Ekspor CSV tagihan: ${items.length} baris${truncated ? " (dipotong pada batas)" : ""}.`,
    metadata: { rows: items.length, truncated, status: query.status, range: query.range, q: query.q || null },
  });

  return new NextResponse(buildInvoiceCsv(items), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tagihan-klandesa-${wibDayKey(now)}.csv"`,
      "Cache-Control": "no-store",
      ...(truncated ? { "X-Export-Truncated": "true" } : {}),
    },
  });
}
