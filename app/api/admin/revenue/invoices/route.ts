import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { invoiceListSelect, invoiceListWhere, parseInvoiceQuery, toInvoiceListItem } from "@/lib/platform/metrics/invoices";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/revenue/invoices?status=&q=&page=&range=&pageSize=
 * Daftar tagihan berhalaman (<= 50/halaman). TANPA payload mentah/URL bayar/QR/VA. `q` = awalan nomor tagihan, kode desa, atau nama desa.
 */
export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const parsed = parseInvoiceQuery(req.nextUrl.searchParams);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const query = parsed.value;
  const now = new Date();
  const where = invoiceListWhere(query, now);

  try {
    const [total, rows] = await Promise.all([
      prisma.billingInvoice.count({ where }),
      prisma.billingInvoice.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: invoiceListSelect,
      }),
    ]);
    return NextResponse.json(
      {
        items: rows.map((r) => toInvoiceListItem(r, now)),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    logger.error({ err }, "[admin/revenue/invoices] gagal memuat daftar tagihan");
    return NextResponse.json({ error: "Daftar tagihan belum bisa dimuat. Coba lagi sebentar lagi." }, { status: 500 });
  }
}
