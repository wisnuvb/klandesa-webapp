import { NextRequest, NextResponse } from "next/server";
import { toUserFacingError } from "@/lib/billing/user-error";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { syncInvoiceWithLinkqu } from "@/lib/billing/service";
import { logger } from "@/lib/logger";

/** Jarak minimum antar pengecekan ke LinkQu per invoice: polling klien tidak boleh membebani gateway. */
const SYNC_MIN_INTERVAL_MS = 7_000;
const lastSyncAt = new Map<string, number>();

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const { id } = await context.params;
    let invId: bigint;
    try {
      invId = BigInt(id);
    } catch {
      return NextResponse.json({ error: "ID invoice tidak valid" }, { status: 400 });
    }
    let invoice = await prisma.billingInvoice.findFirst({
      where: { id: invId, villageId: village.id },
      include: { items: true },
    });

    // Callback bisa terlambat atau tidak sampai (mis. dev lokal): tanyakan status ke LinkQu selagi pending.
    if (invoice?.status === "pending" && (!invoice.expiresAt || invoice.expiresAt.getTime() > Date.now() - 5 * 60_000)) {
      const key = String(invoice.id);
      if (Date.now() - (lastSyncAt.get(key) ?? 0) >= SYNC_MIN_INTERVAL_MS) {
        if (lastSyncAt.size > 2000) lastSyncAt.clear();
        lastSyncAt.set(key, Date.now());
        try {
          const next = await syncInvoiceWithLinkqu(invoice.id);
          if (next && next !== invoice.status) {
            invoice = await prisma.billingInvoice.findFirst({
              where: { id: invId, villageId: village.id },
              include: { items: true },
            });
          }
        } catch (error) {
          logger.warn({ err: error, invoiceId: key }, "[LinkQu] Status sync gagal");
        }
      }
    }

    if (!invoice) {
      return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      invoice: {
        id: String(invoice.id),
        invoiceNumber: invoice.invoiceNumber,
        productType: invoice.productType,
        planCode: invoice.planCode,
        amount: Number(invoice.amount),
        status: invoice.status,
        paymentMethod: invoice.paymentMethod,
        paymentUrl: invoice.paymentUrl,
        qrContent: invoice.qrContent,
        qrImageUrl: invoice.qrImageUrl,
        vaNumber: invoice.vaNumber,
        bankCode: invoice.bankCode,
        expiresAt: invoice.expiresAt?.toISOString() ?? null,
        paidAt: invoice.paidAt?.toISOString() ?? null,
        createdAt: invoice.createdAt.toISOString(),
        items: invoice.items.map((it) => ({
          id: String(it.id),
          name: it.name,
          quantity: it.quantity,
          unitAmount: Number(it.unitAmount),
          totalAmount: Number(it.totalAmount),
        })),
      },
    });
  } catch (error) {
    const friendly = toUserFacingError(error, "GET /api/billing/invoices/[id]");
    return NextResponse.json({ error: friendly.message }, { status: friendly.status });
  }
}
