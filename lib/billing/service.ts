import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLinkquExpiredMinutesFromNow } from "@/lib/linkqu/datetime";
import type {
  LinkquCallbackPayload,
  LinkquCreatePaymentResponse,
} from "@/lib/linkqu/types";
import { verifyLinkquCallbackSignature } from "@/lib/linkqu";
import { getLinkquClient, getLinkquConfig } from "@/lib/billing/linkqu";
import {
  BILLING_CATALOG,
  type BillingProductType,
  type DesaPackageTier,
  arsipStorageLimitForDesaTierGb,
} from "@/lib/billing/catalog";

export type BillingPaymentMethod = "qris" | "va" | "ewallet";

export type BillingCheckoutInput = {
  villageId: number;
  villageCode: string;
  villageName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productType: BillingProductType;
  planCode: string;
  paymentMethod: BillingPaymentMethod;
  bankCode?: string;
  retailCode?: "PAYDANA" | "PAYLINKAJA" | "PAYSHOPEEPAY";
  ewalletPhone?: string;
  metadata?: Prisma.InputJsonValue;
};

function buildInvoiceNumber(villageCode: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${villageCode}-${ts}-${rand}`;
}

function normalizeMoney(amount: number): number {
  return Math.round(Number(amount));
}

function resolvePaymentFields(response: LinkquCreatePaymentResponse) {
  const paymentUrl = response.payment_url ?? response.url_payment ?? null;
  const qrContent = response.qr_content ?? response.qris_text ?? null;
  const qrImageUrl = response.qr_url ?? response.imageqris ?? null;
  const vaNumber = response.va_number ?? response.virtual_account ?? null;
  const bankCode = response.bank_code ?? response.va_code ?? null;
  const transactionId = response.transaction_id ?? null;
  return {
    paymentUrl,
    qrContent,
    qrImageUrl,
    vaNumber,
    bankCode,
    transactionId,
  };
}

function parseCallbackStatus(
  status: unknown,
): "paid" | "expired" | "failed" | "pending" {
  const v = String(status ?? "").toLowerCase();
  if (!v) return "pending";
  if (
    v.includes("paid") ||
    v.includes("success") ||
    v.includes("settlement") ||
    v === "1"
  ) {
    return "paid";
  }
  if (v.includes("expire")) return "expired";
  if (v.includes("fail") || v.includes("cancel")) return "failed";
  return "pending";
}

type CheckoutLineItem = {
  name: string;
  description?: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
  metadata?: Record<string, unknown>;
};

function daysBetweenCeil(from: Date, to: Date): number {
  const diff = to.getTime() - from.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Hitung item tagihan dari state desa — tanpa menulis ke DB. */
async function prepareCheckoutLineItems(
  input: BillingCheckoutInput,
): Promise<{ lineItems: CheckoutLineItem[]; amount: number }> {
  const village = await prisma.village.findUnique({
    where: { id: input.villageId },
    select: {
      id: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      subscriptionExpiry: true,
    },
  });
  if (!village) throw new Error("Village tidak ditemukan");

  const lineItems: CheckoutLineItem[] = [];

  if (input.productType === "desa_package") {
    const tier = input.planCode as DesaPackageTier;
    const tierInfo = BILLING_CATALOG.desa_package.tiers[tier];
    if (!tierInfo) throw new Error("Paket desa tidak valid");
    if (tier === "enterprise" || tierInfo.setupFee === null) {
      throw new Error("Paket Enterprise harus dibuat via invoice manual");
    }

    const hasActive =
      String(village.subscriptionStatus ?? "").toLowerCase() === "active" &&
      village.subscriptionExpiry &&
      village.subscriptionExpiry.getTime() > Date.now();

    const isRenewal =
      hasActive && String(village.subscriptionPlan ?? "").toLowerCase() === tier;

    if (!isRenewal) {
      lineItems.push({
        name: `Paket Desa ${tierInfo.name} (Biaya Awal)`,
        quantity: 1,
        unitAmount: tierInfo.setupFee,
        totalAmount: tierInfo.setupFee,
        metadata: { kind: "setup_fee", tier },
      });
    }

    lineItems.push({
      name: `Langganan Tahunan Paket Desa (${tierInfo.name})`,
      quantity: 1,
      unitAmount: tierInfo.annualFee,
      totalAmount: tierInfo.annualFee,
      metadata: { kind: "annual_fee", tier },
    });
  } else if (input.productType === "absensi") {
    const tier = input.planCode;
    const tierInfo = (
      BILLING_CATALOG.absensi.tiers as Record<
        string,
        { name: string; monthlyFee: number }
      >
    )[tier];
    if (!tierInfo) throw new Error("Paket absensi tidak valid");
    lineItems.push({
      name: `Absensi Perangkat (${tierInfo.name})`,
      quantity: 1,
      unitAmount: tierInfo.monthlyFee,
      totalAmount: tierInfo.monthlyFee,
      metadata: { kind: "monthly_fee", tier },
    });
  } else if (input.productType === "arsip") {
    const tier = input.planCode;
    const tierInfo = (
      BILLING_CATALOG.arsip.tiers as Record<
        string,
        { name: string; monthlyFee: number; storageGb: number }
      >
    )[tier];
    if (!tierInfo) throw new Error("Paket arsip tidak valid");
    lineItems.push({
      name: `Arsip Digital (${tierInfo.name})`,
      quantity: 1,
      unitAmount: tierInfo.monthlyFee,
      totalAmount: tierInfo.monthlyFee,
      metadata: { kind: "monthly_fee", tier, storageGb: tierInfo.storageGb },
    });
  } else if (input.productType === "website") {
    const templateId = Number(input.planCode);
    if (!Number.isFinite(templateId) || templateId <= 0) {
      throw new Error("Template website tidak valid");
    }

    const [nextTemplate, currentSub] = await Promise.all([
      prisma.websiteTemplate.findUnique({ where: { id: templateId } }),
      prisma.websiteSubscription.findUnique({
        where: { villageId: input.villageId },
        include: { template: true },
      }),
    ]);

    if (!nextTemplate || !nextTemplate.isActive) {
      throw new Error("Template website tidak tersedia");
    }

    const now = new Date();
    const hasActiveSub =
      Boolean(currentSub?.isActive) &&
      Boolean(currentSub?.expiryDate) &&
      currentSub!.expiryDate.getTime() > now.getTime();

    const nextPrice = Number(nextTemplate.price);

    if (!hasActiveSub) {
      lineItems.push({
        name: `Website Desa (${nextTemplate.name})`,
        description: "Aktivasi website desa 1 tahun",
        quantity: 1,
        unitAmount: nextPrice,
        totalAmount: nextPrice,
        metadata: {
          kind: "website_activation",
          templateId,
          mode: "new",
        },
      });
    } else {
      const currentTemplate = currentSub!.template;
      const currentPrice = Number(currentTemplate.price);
      const remainingDays = Math.max(0, daysBetweenCeil(now, currentSub!.expiryDate));
      const credit = normalizeMoney((remainingDays / 365) * currentPrice);
      const payable = Math.max(0, normalizeMoney(nextPrice - credit));

      lineItems.push({
        name: `Website Desa (${nextTemplate.name})`,
        description: `Ganti template. Kredit sisa masa aktif: ${remainingDays} hari`,
        quantity: 1,
        unitAmount: payable,
        totalAmount: payable,
        metadata: {
          kind: "website_change_template",
          templateId,
          mode: "change",
          currentTemplateId: currentTemplate.id,
          currentExpiry: currentSub!.expiryDate.toISOString(),
          remainingDays,
          credit,
          nextPrice,
        },
      });
    }
  } else {
    throw new Error("Produk belum didukung");
  }

  const total = lineItems.reduce((sum, li) => sum + li.totalAmount, 0);
  const amount = normalizeMoney(total);
  return { lineItems, amount };
}

export async function createCheckout(input: BillingCheckoutInput) {
  const invoiceNumber = buildInvoiceNumber(input.villageCode);
  const partnerReff = invoiceNumber;

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const expiredStr = getLinkquExpiredMinutesFromNow(30);

  const { lineItems, amount } = await prepareCheckoutLineItems(input);

  const linkqu = getLinkquClient();

  const linkquResponse: LinkquCreatePaymentResponse = await (async () => {
    if (input.paymentMethod === "qris") {
      return linkqu.createQris({
        amount,
        partnerReff,
        customerId: String(input.villageId),
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        expired: expiredStr,
        remark: `${input.productType}:${input.planCode}`,
      });
    }

    if (input.paymentMethod === "va") {
      if (!input.bankCode) throw new Error("bankCode wajib untuk VA");
      return linkqu.createVa({
        amount,
        partnerReff,
        customerId: String(input.villageId),
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        expired: expiredStr,
        bankCode: input.bankCode,
        remark: `${input.productType}:${input.planCode}`,
      });
    }

    if (input.paymentMethod === "ewallet") {
      if (!input.retailCode) throw new Error("retailCode wajib untuk E-Wallet");
      if (!input.ewalletPhone)
        throw new Error("ewalletPhone wajib untuk E-Wallet");
      return linkqu.createEwallet({
        amount,
        partnerReff,
        customerId: String(input.villageId),
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        expired: expiredStr,
        retailCode: input.retailCode,
        ewalletPhone: input.ewalletPhone,
        billTitle: `Klandesa - ${input.productType}`,
      });
    }

    throw new Error("Metode pembayaran tidak valid");
  })();

  const fields = resolvePaymentFields(linkquResponse);

  const created = await prisma.billingInvoice.create({
    data: {
      villageId: input.villageId,
      invoiceNumber,
      partnerReff,
      productType: input.productType,
      planCode: input.planCode,
      amount,
      status: "pending",
      paymentMethod: input.paymentMethod,
      bankCode: input.bankCode ?? fields.bankCode ?? null,
      retailCode: input.retailCode ?? null,
      expiresAt,
      paymentUrl: fields.paymentUrl,
      qrContent: fields.qrContent,
      qrImageUrl: fields.qrImageUrl,
      vaNumber: fields.vaNumber,
      externalTransactionId: fields.transactionId,
      rawResponse: linkquResponse as unknown as object,
      metadata: input.metadata ?? undefined,
      items: {
        create: lineItems.map((li) => {
          const base = {
            name: li.name,
            description: li.description ?? null,
            quantity: li.quantity,
            unitAmount: li.unitAmount,
            totalAmount: li.totalAmount,
          };
          if (!li.metadata) return base;
          return { ...base, metadata: li.metadata as Prisma.InputJsonValue };
        }),
      },
    },
    include: { items: true },
  });

  return created;
}

export async function handleLinkquCallback(payload: LinkquCallbackPayload) {
  const config = getLinkquConfig();
  const signatureValid = verifyLinkquCallbackSignature(
    payload,
    (payload.signature as string | undefined) ?? undefined,
    config.signatureKey,
  );

  const partnerReff = String(payload.partner_reff ?? "");
  if (!partnerReff) {
    return { ok: false, status: 400 as const, error: "partner_reff tidak ada" };
  }

  const invoice = await prisma.billingInvoice.findUnique({
    where: { partnerReff },
    include: { items: true },
  });
  if (!invoice) {
    return {
      ok: false,
      status: 404 as const,
      error: "Invoice tidak ditemukan",
    };
  }

  const mapped = parseCallbackStatus(payload.status);
  const paid = mapped === "paid";

  const amount = payload.amount == null ? null : Number(payload.amount);
  const invoiceAmount = Number(invoice.amount);
  const amountMatches =
    amount == null || Math.round(amount) === Math.round(invoiceAmount);

  await prisma.billingPaymentEvent.create({
    data: {
      invoiceId: invoice.id,
      partnerReff: partnerReff || null,
      transactionId: payload.transaction_id
        ? String(payload.transaction_id)
        : null,
      status: payload.status ? String(payload.status) : null,
      signatureValid,
      payload: payload as unknown as object,
    },
  });

  if (!signatureValid) {
    return { ok: false, status: 400 as const, error: "Signature tidak valid" };
  }

  if (!amountMatches) {
    return { ok: false, status: 400 as const, error: "Amount tidak sesuai" };
  }

  if (invoice.status === "paid") {
    return { ok: true, status: 200 as const, invoiceStatus: invoice.status };
  }

  const nextStatus = paid ? "paid" : mapped;

  if (nextStatus === "pending") {
    return { ok: true, status: 200 as const, invoiceStatus: invoice.status };
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.billingInvoice.update({
      where: { id: invoice.id },
      data: {
        status: nextStatus,
        paidAt: paid ? now : null,
        externalTransactionId: payload.transaction_id
          ? String(payload.transaction_id)
          : null,
        metadata: {
          ...(typeof invoice.metadata === "object" && invoice.metadata
            ? (invoice.metadata as object)
            : {}),
          lastCallbackAt: now.toISOString(),
          lastCallbackStatus: payload.status ?? null,
        },
      },
    });

    if (!paid) return;

    if (invoice.productType === "desa_package") {
      const tier = invoice.planCode as DesaPackageTier;
      const expiry = new Date(now);
      expiry.setFullYear(expiry.getFullYear() + 1);

      await tx.village.update({
        where: { id: invoice.villageId },
        data: {
          subscriptionPlan: tier,
          subscriptionStatus: "active",
          subscriptionDate: now,
          subscriptionExpiry: expiry,
          storageLimit: arsipStorageLimitForDesaTierGb(tier),
        },
      });
    }

    if (invoice.productType === "arsip") {
      const tier = invoice.planCode;
      const tierInfo = (
        BILLING_CATALOG.arsip.tiers as Record<
          string,
          { name: string; monthlyFee: number; storageGb: number }
        >
      )[tier];
      if (!tierInfo) return;

      await tx.village.update({
        where: { id: invoice.villageId },
        data: {
          storageLimit: tierInfo.storageGb,
        },
      });
    }

    if (invoice.productType === "absensi") {
      const tier = invoice.planCode;
      const mappedTier = ((): string => {
        if (tier === "starter") return "starter";
        if (tier === "professional") return "profesional";
        if (tier === "enterprise") return "enterprise";
        return String(tier);
      })();

      await tx.village.update({
        where: { id: invoice.villageId },
        data: {
          subscriptionPlan: mappedTier,
          subscriptionStatus: "active",
          subscriptionDate: now,
        },
      });
    }

    if (invoice.productType === "website") {
      const templateId = Number(invoice.planCode);
      if (!Number.isFinite(templateId) || templateId <= 0) return;

      const template = await tx.websiteTemplate.findUnique({
        where: { id: templateId },
        select: { id: true, isActive: true },
      });
      if (!template?.isActive) return;

      const expiry = new Date(now);
      expiry.setFullYear(expiry.getFullYear() + 1);

      const meta =
        invoice.metadata && typeof invoice.metadata === "object"
          ? (invoice.metadata as Record<string, unknown>)
          : null;
      const websiteMeta =
        meta && typeof meta.website === "object" && meta.website
          ? (meta.website as Record<string, unknown>)
          : null;

      const domainType = String(websiteMeta?.domainType ?? "");
      const domainValue = String(websiteMeta?.domain ?? "").trim();

      const isCustom = domainType === "custom" && domainValue.length > 0;
      const isSubdomain = domainType === "subdomain" && domainValue.length > 0;

      if (isSubdomain) {
        await tx.village.update({
          where: { id: invoice.villageId },
          data: {
            website: `${domainValue}.klandesa.id`,
          },
        });
      }

      await tx.websiteSubscription.upsert({
        where: { villageId: invoice.villageId },
        create: {
          villageId: invoice.villageId,
          templateId: templateId,
          startDate: now,
          expiryDate: expiry,
          isActive: true,
          customDomain: isCustom ? domainValue : null,
        },
        update: {
          templateId: templateId,
          startDate: now,
          expiryDate: expiry,
          isActive: true,
          customDomain: isCustom ? domainValue : null,
          customization: Prisma.DbNull,
        },
      });
    }
  });

  return { ok: true, status: 200 as const, invoiceStatus: nextStatus };
}
