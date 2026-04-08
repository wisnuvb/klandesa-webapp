import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { resolveVillage } from "@/lib/village";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village tidak ditemukan" }, { status: 404 });
    }

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

