import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import {
  createCheckout,
  type BillingPaymentMethod,
} from "@/lib/billing/service";
import type { BillingProductType } from "@/lib/billing/catalog";
import {
  isAllowedLinkquVaBankCode,
  resolveLinkquBankCode,
  validateLinkquCheckoutInput,
} from "@/lib/payment/linkqu-channels";

/** Hanya aktif jika `BILLING_DEBUG_CHECKOUT=true` — jangan aktifkan di produksi. */
export async function GET(req: NextRequest) {
  if (process.env.BILLING_DEBUG_CHECKOUT !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    console.log("[BILLING DEBUG] Debug session request");

    const cookies = req.cookies.getAll();
    console.log("[BILLING DEBUG] Cookies:", {
      count: cookies.length,
      names: cookies.map((c) => c.name),
      sessionToken:
        cookies
          .find((c) => c.name.includes("next-auth.session-token"))
          ?.value?.substring(0, 50) + "...",
    });

    const loaded = await requireVillageApiContext(req);
    const session = loaded.ok ? loaded.ctx.session : null;
    const village = loaded.ok ? loaded.ctx.village : null;

    console.log("[BILLING DEBUG] Session:", {
      hasSession: !!session,
      hasUser: !!session?.user,
      user: session?.user
        ? {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: session.user.role,
            villageId: session.user.villageId,
            villageCode: session.user.villageCode,
          }
        : null,
    });
    console.log("[BILLING DEBUG] Village:", {
      hasVillage: !!village,
      village: village
        ? {
            id: village.id,
            code: village.code,
            name: village.name,
          }
        : null,
    });

    return NextResponse.json({
      session: {
        exists: !!session,
        user: session?.user
          ? {
              id: session.user.id,
              email: session.user.email,
              villageCode: session.user.villageCode,
            }
          : null,
      },
      village: village
        ? {
            id: village.id,
            code: village.code,
            name: village.name,
          }
        : null,
      cookies: {
        count: cookies.length,
        hasSessionToken: cookies.some((c) =>
          c.name.includes("next-auth.session-token"),
        ),
      },
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("[BILLING DEBUG] Error:", error);
    return NextResponse.json(
      { error: "Debug failed", details: error.message },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, session } = loaded.ctx;

    const body = (await req.json().catch(() => null)) as {
      productType?: string;
      planCode?: string;
      paymentMethod?: string;
      bankCode?: string;
      bankChannelId?: string;
      retailCode?: string;
      ewalletPhone?: string;
      metadata?: unknown;
    } | null;

    const productType = String(body?.productType ?? "");
    const planCode = String(body?.planCode ?? "");
    const paymentMethod = String(
      body?.paymentMethod ?? "va",
    ) as BillingPaymentMethod;

    let bankCode: string | undefined =
      typeof body?.bankCode === "string" ? body.bankCode.trim() : undefined;
    if (body?.bankChannelId) {
      const resolved = resolveLinkquBankCode(String(body.bankChannelId));
      if (!resolved) {
        return NextResponse.json({ error: "Bank tidak valid" }, { status: 400 });
      }
      bankCode = resolved;
    }

    if (!productType || !planCode) {
      return NextResponse.json(
        { error: "productType dan planCode wajib" },
        { status: 400 },
      );
    }

    const allowedProducts: BillingProductType[] = [
      "desa_package",
      "absensi",
      "absensi_gps_addon",
      "arsip",
      "website",
    ];
    if (!allowedProducts.includes(productType as BillingProductType)) {
      return NextResponse.json(
        { error: "productType tidak valid" },
        { status: 400 },
      );
    }

    const checkoutValidation = validateLinkquCheckoutInput({
      paymentMethod,
      bankCode,
      retailCode: body?.retailCode,
      ewalletPhone: body?.ewalletPhone,
    });
    if (!checkoutValidation.ok) {
      return NextResponse.json(
        { error: checkoutValidation.error },
        { status: 400 },
      );
    }

    if (paymentMethod === "va" && bankCode && !isAllowedLinkquVaBankCode(bankCode)) {
      return NextResponse.json(
        { error: "Bank VA tidak didukung. Pilih bank dari daftar." },
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
      bankCode,
      retailCode,
      ewalletPhone: body?.ewalletPhone,
      metadata:
        body?.metadata && typeof body.metadata === "object"
          ? (body.metadata as object)
          : undefined,
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
