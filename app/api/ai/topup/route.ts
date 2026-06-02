import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { createCheckout } from "@/lib/billing/service";
import type { BillingPaymentMethod } from "@/lib/billing/service";

export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { ctx } = loaded;
    const { village, userId, session } = ctx;

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const pkgId = String(body.packageId ?? "");
    const paymentMethodRaw = String(body.paymentMethod ?? "").toLowerCase();

    // Map credits from package id
    const CREDIT_PACKAGES: Record<string, { credits: number; price: number }> = {
      pkg1: { credits: 250, price: 50000 },
      pkg2: { credits: 500, price: 90000 },
      pkg3: { credits: 1333, price: 200000 },
      pkg4: { credits: 2500, price: 350000 },
    };

    const pkg = CREDIT_PACKAGES[pkgId];
    if (!pkg) {
      return NextResponse.json({ error: "Paket kredit tidak valid" }, { status: 400 });
    }

    const paymentMethod = (paymentMethodRaw === "ewallet" ? "ewallet" : "va") as BillingPaymentMethod;

    const { invoice, reused } = await createCheckout({
      villageId: village.id,
      villageCode: village.code,
      villageName: village.name,
      customerName: String(session.user?.name ?? ""),
      customerEmail: String(session.user?.email ?? ""),
      customerPhone: String((session.user as Record<string, unknown>)?.phone ?? ""),
      productType: "ai_credits",
      planCode: String(pkg.credits),
      paymentMethod,
      bankCode: paymentMethod === "va" ? "bca" : undefined,
      retailCode: paymentMethod === "ewallet" ? "PAYDANA" : undefined,
      ewalletPhone: paymentMethod === "ewallet" ? String((session.user as Record<string, unknown>)?.phone ?? "") : undefined,
      metadata: { userId },
    });

    return NextResponse.json({
      ok: true,
      reused,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        partnerReff: invoice.partnerReff,
        status: invoice.status,
        amount: Number(invoice.amount),
        paymentMethod: invoice.paymentMethod,
        vaNumber: invoice.vaNumber,
        qrImageUrl: invoice.qrImageUrl,
        paymentUrl: invoice.paymentUrl,
        qrContent: invoice.qrContent,
        expiresAt: invoice.expiresAt,
        items: invoice.items.map((item) => ({
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          totalAmount: Number(item.totalAmount),
        })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
