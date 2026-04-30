import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const invoices = await prisma.billingInvoice.findMany({
      where: { villageId: village.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { items: true },
    });

    return NextResponse.json({
      invoices: invoices.map((inv) => ({
        id: String(inv.id),
        invoiceNumber: inv.invoiceNumber,
        productType: inv.productType,
        planCode: inv.planCode,
        amount: Number(inv.amount),
        status: inv.status,
        paymentMethod: inv.paymentMethod,
        paymentUrl: inv.paymentUrl,
        qrContent: inv.qrContent,
        qrImageUrl: inv.qrImageUrl,
        vaNumber: inv.vaNumber,
        bankCode: inv.bankCode,
        expiresAt: inv.expiresAt?.toISOString() ?? null,
        paidAt: inv.paidAt?.toISOString() ?? null,
        createdAt: inv.createdAt.toISOString(),
        items: inv.items.map((it) => ({
          id: String(it.id),
          name: it.name,
          quantity: it.quantity,
          unitAmount: Number(it.unitAmount),
          totalAmount: Number(it.totalAmount),
        })),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

