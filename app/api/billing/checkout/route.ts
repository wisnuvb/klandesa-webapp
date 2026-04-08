import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { resolveVillage } from "@/lib/village";
import {
  createCheckout,
  type BillingPaymentMethod,
} from "@/lib/billing/service";
import type { BillingProductType } from "@/lib/billing/catalog";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json(
        { error: "Village tidak ditemukan" },
        { status: 404 },
      );
    }

    const body = (await req.json().catch(() => null)) as {
      productType?: string;
      planCode?: string;
      paymentMethod?: string;
      bankCode?: string;
      retailCode?: string;
      ewalletPhone?: string;
    } | null;

    const productType = String(body?.productType ?? "");
    const planCode = String(body?.planCode ?? "");
    const paymentMethod = String(
      body?.paymentMethod ?? "qris",
    ) as BillingPaymentMethod;

    if (!productType || !planCode) {
      return NextResponse.json(
        { error: "productType dan planCode wajib" },
        { status: 400 },
      );
    }

    const allowedProducts: BillingProductType[] = [
      "desa_package",
      "absensi",
      "arsip",
      "website",
    ];
    if (!allowedProducts.includes(productType as BillingProductType)) {
      return NextResponse.json(
        { error: "productType tidak valid" },
        { status: 400 },
      );
    }

    const retailCode =
      body?.retailCode === "PAYDANA" ||
      body?.retailCode === "PAYLINKAJA" ||
      body?.retailCode === "PAYSHOPEEPAY"
        ? body.retailCode
        : undefined;

    const customerName = session.user.name || village.name;
    const customerEmail =
      session.user.email || village.email || "billing@klandesa.id";
    const customerPhone = village.phone || "0000000000";

    const invoice = await createCheckout({
      villageId: village.id,
      villageCode: village.code,
      villageName: village.name,
      customerName,
      customerEmail,
      customerPhone,
      productType: productType as BillingProductType,
      planCode,
      paymentMethod,
      bankCode: body?.bankCode,
      retailCode,
      ewalletPhone: body?.ewalletPhone,
    });

    return NextResponse.json({
      invoice: {
        id: String(invoice.id),
        invoiceNumber: invoice.invoiceNumber,
        productType: invoice.productType,
        planCode: invoice.planCode,
        amount: Number(invoice.amount),
        status: invoice.status,
        expiresAt: invoice.expiresAt?.toISOString() ?? null,
        paymentMethod: invoice.paymentMethod,
        paymentUrl: invoice.paymentUrl,
        qrContent: invoice.qrContent,
        qrImageUrl: invoice.qrImageUrl,
        vaNumber: invoice.vaNumber,
        bankCode: invoice.bankCode,
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
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
