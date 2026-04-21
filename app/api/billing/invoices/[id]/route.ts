import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-session";
import { resolveVillage } from "@/lib/village";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village tidak ditemukan" }, { status: 404 });
    }

    const { id } = await context.params;
    let invId: bigint;
    try {
      invId = BigInt(id);
    } catch {
      return NextResponse.json({ error: "ID invoice tidak valid" }, { status: 400 });
    }
    const invoice = await prisma.billingInvoice.findFirst({
      where: { id: invId, villageId: village.id },
      include: { items: true },
    });

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
    const message = error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
