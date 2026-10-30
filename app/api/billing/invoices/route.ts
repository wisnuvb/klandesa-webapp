import { NextRequest, NextResponse } from "next/server";
import { toUserFacingError } from "@/lib/billing/user-error";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import {
  displayInvoiceStatus,
  invoiceStatusWhere,
  isInvoiceStatusFilter,
} from "@/lib/billing/invoice-filters";

export const dynamic = "force-dynamic";

/**
 * Riwayat tagihan desa dengan filter & paginasi.
 * Query: `page`, `pageSize` (maks 50), `status` (pending|paid|expired|failed), `productType`.
 * `canResume` = masih bisa dibayar, sehingga instruksi (VA/QRIS) bisa dibuka lagi.
 */
export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const q = req.nextUrl.searchParams;
    const page = Math.max(1, Math.floor(Number(q.get("page")) || 1));
    const pageSize = Math.min(50, Math.max(1, Math.floor(Number(q.get("pageSize")) || 10)));
    const statusParam = q.get("status");
    const productType = q.get("productType")?.trim() || null;

    const now = new Date();
    const where: Prisma.BillingInvoiceWhereInput = {
      villageId: village.id,
      ...(isInvoiceStatusFilter(statusParam) ? invoiceStatusWhere(statusParam, now) : {}),
      ...(productType ? { productType } : {}),
    };

    const [total, rows, pendingCount, productTypes] = await Promise.all([
      prisma.billingInvoice.count({ where }),
      prisma.billingInvoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { items: true },
      }),
      prisma.billingInvoice.count({ where: { villageId: village.id, ...invoiceStatusWhere("pending", now) } }),
      prisma.billingInvoice.groupBy({ by: ["productType"], where: { villageId: village.id } }),
    ]);

    const nowMs = now.getTime();
    return NextResponse.json(
      {
        invoices: rows.map((inv) => {
          const status = displayInvoiceStatus(inv.status, inv.expiresAt, nowMs);
          return {
            id: String(inv.id),
            invoiceNumber: inv.invoiceNumber,
            productType: inv.productType,
            planCode: inv.planCode,
            amount: Number(inv.amount),
            status,
            canResume: status === "pending",
            paymentMethod: inv.paymentMethod,
            paymentUrl: inv.paymentUrl,
            qrContent: inv.qrContent,
            qrImageUrl: inv.qrImageUrl,
            vaNumber: inv.vaNumber,
            bankCode: inv.bankCode,
            retailCode: inv.retailCode,
            expiresAt: inv.expiresAt?.toISOString() ?? null,
            paidAt: inv.paidAt?.toISOString() ?? null,
            createdAt: inv.createdAt.toISOString(),
            items: inv.items.map((it) => ({
              id: String(it.id),
              name: it.name,
              description: it.description,
              quantity: it.quantity,
              unitAmount: Number(it.unitAmount),
              totalAmount: Number(it.totalAmount),
            })),
          };
        }),
        total,
        page,
        pageSize,
        pageCount: Math.max(1, Math.ceil(total / pageSize)),
        pendingCount,
        productTypes: productTypes.map((p) => p.productType),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const friendly = toUserFacingError(error, "GET /api/billing/invoices");
    return NextResponse.json({ error: friendly.message }, { status: friendly.status });
  }
}
