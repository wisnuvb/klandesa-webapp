import {
  ARSIP_ADDON_MODULE_CODE,
  isArsipAddonActive,
  nextArsipExpiry,
  validateArsipPurchase,
} from "@/lib/digitalArchive/storage-limit";
import { aiCreditPriceForCredits } from "@/lib/ai/credit-packages";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLinkquExpiredMinutesFromNow } from "@/lib/linkqu/datetime";
import type {
  LinkquCallbackPayload,
  LinkquCreatePaymentResponse,
} from "@/lib/linkqu/types";
import { verifyLinkquCallbackSignature } from "@/lib/linkqu";
import { logger } from "@/lib/logger";
import { isChannelInactiveResponse, markChannelHealthy, markChannelUnavailable } from "@/lib/payment/channel-health";
import { getAdminDisabledChannels, recordChannelFailure } from "@/lib/payment/channel-settings";
import { checkoutChannelCode, evaluateCheckoutChannel } from "@/lib/payment/linkqu-channels";
import {
  addMonths,
  monthsFromInvoiceItems,
  parseDurationMonths,
  priceForMonths,
  type SubscriptionMonths,
} from "@/lib/billing/duration";
import {
  ATTENDANCE_CAPACITY_MODULE_CODE,
  isCapacityAddonCode,
  isGpsAddonActive,
  nextCapacityExpiry,
  nextGpsAddonExpiry,
  validateCapacityPurchase,
  capacityAddonStaffLimit,
} from "@/lib/attendance/addons";
import { getActiveCapacityAddon } from "@/lib/attendance/capacity-server";
import { getLinkquClient, getLinkquConfig } from "@/lib/billing/linkqu";
import {
  ABSENSI_GPS_ADDON_PLAN_CODE,
  BILLING_CATALOG,
  type BillingProductType,
  type DesaPackageTier,
  arsipStorageLimitForDesaTierGb,
} from "@/lib/billing/catalog";
import { isVillageSubscriptionReadable } from "@/lib/subscription";
import { isLegacyTier, LENGKAP_TIER, lengkapLineItems, lengkapNextExpiry, parseRenewalMonths } from "@/lib/billing/lengkap";
import { AI_ASSISTANT_NAME } from "@/lib/ai/persona";
import { accrueSubscriptionCommissionInTx } from "@/lib/partner/commission";
import {
  checkSubdomainAvailability,
  registerPendingCustomDomainInTx,
  registerPrimarySubdomainInTx,
} from "@/lib/domain/service";
import { validateHostnameFqdn } from "@/lib/domain/validators";
import { isWebsiteSubscriptionLive, nextWebsiteExpiry } from "@/lib/website-engine/subscription-state";
import {
  WEBSITE_CUSTOM_MODULE_CODE,
  WEBSITE_CUSTOM_PLAN_CODE,
  isWebsiteCustomActive,
  nextWebsiteCustomExpiry,
  websiteCustomLineItems,
} from "@/lib/website-service/subscription";

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
  /** URL webhook absolut untuk tagihan ini, dibentuk dari host permintaan (`buildLinkquCallbackUrl`). */
  callbackUrl: string;
  metadata?: Prisma.InputJsonValue;
};

function buildInvoiceNumber(villageCode: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${villageCode}-${ts}-${rand}`;
}

/** partner_reff LinkQu: digit saja (13 digit waktu + 6 digit acak) agar cocok dengan checkstatus dan rumus signature. */
function buildPartnerReff(): string {
  const rand = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");
  return `${Date.now()}${rand}`;
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

/** Lama langganan yang diminta klien (metadata.months); kosong = 1 bulan, nilai di luar pilihan ditolak. */
function requestedMonths(metadata: BillingCheckoutInput["metadata"]): SubscriptionMonths {
  const raw =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>).months
      : undefined;
  const months = parseDurationMonths(raw);
  if (months == null) throw new Error("Durasi langganan tidak valid");
  return months;
}

const monthsSuffix = (months: number) => (months > 1 ? ` — ${months} bulan` : "");
const termText = (months: number, renewal: boolean) =>
  `${renewal ? "Perpanjangan" : "Langganan"} ${months} bulan`;

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
/** True bila desa pernah membayar Paket Lengkap (biaya awal atau perpanjangan). */
export async function hasPurchasedLengkap(villageId: number): Promise<boolean> {
  const paid = await prisma.billingInvoice.findFirst({
    where: { villageId, productType: "desa_package", planCode: LENGKAP_TIER, status: "paid" },
    select: { id: true },
  });
  return paid != null;
}

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
      absensiGpsAddonActive: true,
      absensiGpsAddonExpiry: true,
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

    if (tier === LENGKAP_TIER) {
      // Desa lama yang masih berlangganan paketnya tidak diam-diam dipindah (sisa masa berlaku akan hilang).
      if (hasActive && isLegacyTier(village.subscriptionPlan)) {
        throw new Error("Paket desa Anda saat ini masih berlaku. Perpanjang paket yang sedang berjalan atau hubungi admin Klandesa.");
      }
      // Pernah membayar Paket Lengkap (walau sudah habis) = perpanjangan, tanpa biaya awal lagi.
      // Dasarnya invoice lunas, bukan plan/expiry: desa trial juga berpaket "lengkap" dan punya expiry.
      const wasLengkap = await hasPurchasedLengkap(village.id);
      const meta = input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata) ? (input.metadata as Record<string, unknown>) : null;
      for (const li of lengkapLineItems({ isRenewal: wasLengkap, months: meta?.months })) lineItems.push(li);
      const total = lineItems.reduce((sum, li) => sum + li.totalAmount, 0);
      return { lineItems, amount: normalizeMoney(total) };
    }

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
    // Add-on kapasitas absensi (langganan bulanan). Tidak mengubah paket desa; kapasitas efektif = terbesar
    // antara paket dan add-on aktif (lib/attendance/addons.ts).
    if (!isVillageSubscriptionReadable(village)) {
      throw new Error("Langganan desa tidak aktif. Aktifkan paket desa di halaman Tagihan.");
    }
    const active = await getActiveCapacityAddon(village.id);
    const purchase = validateCapacityPurchase({
      plan: village.subscriptionPlan,
      code: input.planCode,
      active,
    });
    if (!purchase.ok) throw new Error(purchase.error);
    const tierInfo = BILLING_CATALOG.absensi.tiers[purchase.code];
    const staffLimit = capacityAddonStaffLimit(purchase.code);
    const months = requestedMonths(input.metadata);
    const total = priceForMonths(purchase.price, months);
    lineItems.push({
      name: `Kapasitas Absensi ${staffLimit} Perangkat (${tierInfo.name})${monthsSuffix(months)}`,
      description: termText(months, purchase.isRenewal),
      quantity: 1,
      unitAmount: total,
      totalAmount: total,
      metadata: {
        kind: "absensi_capacity_monthly",
        tier: purchase.code,
        staffLimit,
        listPrice: tierInfo.monthlyFee,
        months,
      },
    });
  } else if (input.productType === "absensi_gps_addon") {
    if (input.planCode !== ABSENSI_GPS_ADDON_PLAN_CODE) {
      throw new Error("Paket add-on GPS tidak valid");
    }
    if (!isVillageSubscriptionReadable(village)) {
      throw new Error("Langganan desa tidak aktif. Aktifkan paket desa di halaman Tagihan.");
    }
    // Aktif tanpa batas waktu (desa lama / diaktifkan admin) tidak perlu dibayar; yang berbatas waktu boleh diperpanjang.
    if (isGpsAddonActive(village) && village.absensiGpsAddonExpiry == null) {
      throw new Error("Add-on GPS sudah aktif untuk desa ini.");
    }
    const addon = BILLING_CATALOG.absensi_gps_addon;
    const renewal = isGpsAddonActive(village);
    const months = requestedMonths(input.metadata);
    const total = priceForMonths(addon.monthlyFee, months);
    lineItems.push({
      name: `${addon.name}${monthsSuffix(months)}`,
      description: termText(months, renewal),
      quantity: 1,
      unitAmount: total,
      totalAmount: total,
      metadata: { kind: "absensi_gps_monthly", planCode: ABSENSI_GPS_ADDON_PLAN_CODE, months },
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
    const activeArsip = await prisma.villageModuleSubscription.findUnique({
      where: { villageId_moduleCode: { villageId: village.id, moduleCode: ARSIP_ADDON_MODULE_CODE } },
      select: { planCode: true, status: true, expiryDate: true },
    });
    const purchase = validateArsipPurchase({
      plan: village.subscriptionPlan,
      tierCode: tier,
      active: isArsipAddonActive(activeArsip) ? activeArsip : null,
    });
    if (!purchase.ok) throw new Error(purchase.error);
    const months = requestedMonths(input.metadata);
    const total = priceForMonths(tierInfo.monthlyFee, months);
    lineItems.push({
      name: `Arsip Digital ${tierInfo.storageGb} GB (${months > 1 ? `${months} bulan` : "langganan bulanan"})`,
      quantity: 1,
      unitAmount: total,
      totalAmount: total,
      metadata: { kind: "monthly_fee", tier, storageGb: tierInfo.storageGb, months },
    });
  } else if (input.productType === "website_custom") {
    // Layanan jasa website kustom: biaya awal (12 bulan) untuk pembelian pertama, perpanjangan bulanan sesudahnya.
    if (input.planCode !== WEBSITE_CUSTOM_PLAN_CODE) {
      throw new Error("Paket website tidak valid");
    }
    const existing = await prisma.villageModuleSubscription.findUnique({
      where: { villageId_moduleCode: { villageId: village.id, moduleCode: WEBSITE_CUSTOM_MODULE_CODE } },
      select: { id: true },
    });
    const meta = input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata) ? (input.metadata as Record<string, unknown>) : null;
    for (const li of websiteCustomLineItems({ isRenewal: existing != null, months: meta?.months })) lineItems.push(li);
  } else if (input.productType === "website") {
    // Marketplace template lama: tidak lagi dipanggil dari UI maupun /api/billing/checkout (2026-10-30); kode dibiarkan.
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
    const hasActiveSub = isWebsiteSubscriptionLive(currentSub, now);
    const sameTemplate = currentSub?.templateId === templateId;

    const nextPrice = Number(nextTemplate.price);

    if (sameTemplate) {
      // Perpanjangan template yang sama: harga penuh 1 tahun, masa aktif disambung, kustomisasi dipertahankan.
      lineItems.push({
        name: `Perpanjang Website Desa (${nextTemplate.name})`,
        description: "Perpanjangan website desa 1 tahun",
        quantity: 1,
        unitAmount: nextPrice,
        totalAmount: nextPrice,
        metadata: {
          kind: "website_renewal",
          templateId,
          mode: "renew",
          currentExpiry: currentSub!.expiryDate.toISOString(),
        },
      });
    } else if (!hasActiveSub) {
      if (!currentSub) {
        // Aktivasi pertama: alamat dipilih sekarang, jadi pastikan valid dan belum dipakai sebelum ditagih.
        const meta = input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
          ? (input.metadata as Record<string, unknown>)
          : null;
        const web = meta && typeof meta.website === "object" && meta.website
          ? (meta.website as Record<string, unknown>)
          : null;
        const domainType = String(web?.domainType ?? "");
        const domainValue = String(web?.domain ?? "").trim();
        if (domainType === "subdomain") {
          const chk = await checkSubdomainAvailability(domainValue, input.villageId);
          if (!chk.ok) throw new Error(chk.error);
        } else if (domainType === "custom") {
          const v = validateHostnameFqdn(domainValue);
          if (!v.ok) throw new Error(v.error);
          const used = await prisma.websiteDomain.findUnique({
            where: { hostname: v.value },
            select: { villageId: true },
          });
          if (used && used.villageId !== input.villageId) throw new Error("Domain sudah dipakai desa lain");
        }
      }
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
  } else if (input.productType === "ai_credits") {
    const credits = Number(input.planCode);
    // Harga hanya dari paket resmi (lib/ai/credit-packages.ts), bukan dihitung dari jumlah kredit kiriman klien.
    const packagePrice = aiCreditPriceForCredits(credits);
    if (packagePrice == null) {
      throw new Error("Paket kredit tidak valid");
    }
    const totalAmount = normalizeMoney(packagePrice);
    lineItems.push({
      name: `Top Up Kredit AI (${credits} kredit)`,
      description: `Kredit untuk ${AI_ASSISTANT_NAME} — Asisten Desa`,
      quantity: 1,
      unitAmount: totalAmount,
      totalAmount,
      metadata: {
        kind: "ai_credits",
        credits,
        userId:
          input.metadata && typeof input.metadata === "object"
            ? (input.metadata as Record<string, unknown>).userId
            : undefined,
      },
    });
  } else if (input.productType === "module_addon") {
    const code = input.planCode;
    const tierInfo = (
      BILLING_CATALOG.module_addon as Record<
        string,
        { name: string; monthlyFee: number }
      >
    )[code];
    if (!tierInfo) throw new Error("Modul add-on tidak valid");
    const months = requestedMonths(input.metadata);
    const total = priceForMonths(tierInfo.monthlyFee, months);
    lineItems.push({
      name: `Modul ${tierInfo.name}${monthsSuffix(months)}`,
      description: termText(months, false),
      quantity: 1,
      unitAmount: total,
      totalAmount: total,
      metadata: { kind: "module_addon_monthly", moduleCode: code, months },
    });
  } else {
    throw new Error("Produk belum didukung");
  }

  const total = lineItems.reduce((sum, li) => sum + li.totalAmount, 0);
  const amount = normalizeMoney(total);
  return { lineItems, amount };
}

/** JSON.stringify dengan urutan kunci stabil (MySQL JSON menyusun ulang kunci objek). */
function stableJson(value: unknown): string {
  if (value == null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableJson(obj[k])}`)
    .join(",")}}`;
}

/** Tagihan pending hanya dipakai ulang bila produk, paket, dan cara bayarnya persis sama. */
function sameCheckoutIntent(
  inv: {
    planCode: string;
    paymentMethod: string | null;
    bankCode: string | null;
    retailCode: string | null;
    metadata: unknown;
  },
  input: BillingCheckoutInput,
): boolean {
  if (inv.planCode !== input.planCode) return false;
  if (inv.paymentMethod !== input.paymentMethod) return false;
  if (input.paymentMethod === "va" && inv.bankCode !== (input.bankCode ?? null)) return false;
  if (input.paymentMethod === "ewallet" && inv.retailCode !== (input.retailCode ?? null)) return false;
  return stableJson(inv.metadata) === stableJson(input.metadata);
}

export async function createCheckout(input: BillingCheckoutInput) {
  if (!input.callbackUrl) throw new Error("callbackUrl wajib diisi");

  const existingPending = await prisma.billingInvoice.findMany({
    where: {
      villageId: input.villageId,
      productType: input.productType,
      status: "pending",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
  const reusable = existingPending.find((inv) => sameCheckoutIntent(inv, input));
  if (reusable) return { invoice: reusable, reused: true as const };
  if (existingPending.length >= 5) {
    throw new Error("Terlalu banyak tagihan yang belum dibayar. Selesaikan atau tunggu tagihan sebelumnya kedaluwarsa.");
  }

  const invoiceNumber = buildInvoiceNumber(input.villageCode);
  const partnerReff = buildPartnerReff();

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const expiredStr = getLinkquExpiredMinutesFromNow(30);

  const { lineItems, amount } = await prepareCheckoutLineItems(input);

  // Tolak kanal yang tidak tersedia (ditutup lewat env, baru saja ditolak LinkQu, atau di luar batas nominal)
  // sebelum membuat tagihan, memakai nominal resmi hasil hitungan server.
  const channel = evaluateCheckoutChannel(input, amount, await getAdminDisabledChannels());
  if (!channel.available) {
    throw new Error(`${channel.label} tidak bisa dipakai: ${channel.reason ?? "sedang tidak tersedia"}. Silakan pilih metode lain.`);
  }

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
        callbackUrl: input.callbackUrl,
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
        callbackUrl: input.callbackUrl,
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
        callbackUrl: input.callbackUrl,
        retailCode: input.retailCode,
        ewalletPhone: input.ewalletPhone,
        billTitle: `Klandesa - ${input.productType}`,
      });
    }

    throw new Error("Metode pembayaran tidak valid");
  })().then(
    (response) => {
      const code = checkoutChannelCode(input);
      if (code) markChannelHealthy(code);
      return response;
    },
    (error: unknown) => {
      // Penolakan yang menandakan KANAL tidak aktif: sembunyikan dari pilihan pengguna berikutnya untuk sementara.
      const r = (error as { linkquResponse?: { response_code?: unknown; response_desc?: unknown } }).linkquResponse;
      const code = checkoutChannelCode(input);
      if (code && isChannelInactiveResponse(r)) {
        markChannelUnavailable(code, "Sedang tidak tersedia, coba lagi nanti");
        // Tampilkan di panel admin supaya tim tahu kanal mana yang ditolak LinkQu (tidak menunggu).
        void recordChannelFailure(code, String(r?.response_desc ?? r?.response_code ?? "Ditolak LinkQu"));
        logger.warn({ code, linkquResponse: r }, "[LinkQu] Kanal ditandai tidak tersedia sementara");
        throw new Error(`${channel.label} sedang tidak tersedia. Silakan pilih metode lain.`);
      }
      throw error;
    },
  );

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

  return { invoice: created, reused: false as const };
}

type InvoiceWithItems = Prisma.BillingInvoiceGetPayload<{ include: { items: true } }>;

/** Callback jenis lain (mis. `settle` = pencairan dana ke merchant) hanya diakui, tidak mengubah tagihan. */
function isPaymentCallbackType(type: unknown): boolean {
  const t = String(type ?? "pay").trim().toLowerCase();
  return t === "" || t === "pay";
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

  const amount = payload.amount == null ? null : Number(payload.amount);
  const invoiceAmount = Number(invoice.amount);
  const amountMatches =
    amount != null && Number.isFinite(amount) && Math.round(amount) === Math.round(invoiceAmount);

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

  if (!isPaymentCallbackType(payload.type)) {
    return { ok: true, status: 200 as const, invoiceStatus: invoice.status };
  }

  if (!amountMatches) {
    return { ok: false, status: 400 as const, error: "Amount tidak sesuai" };
  }

  return applyInvoiceOutcome(invoice, mapped, {
    rawStatus: payload.status ? String(payload.status) : null,
    transactionId: payload.transaction_id ? String(payload.transaction_id) : null,
    source: "callback",
  });
}

/**
 * Rekonsiliasi saat callback belum/tidak masuk (mis. dev lokal, atau webhook gagal): tanya status ke LinkQu
 * lalu terapkan hasilnya lewat jalur yang sama dengan callback. Mengembalikan status invoice terbaru.
 */
export async function syncInvoiceWithLinkqu(invoiceId: bigint): Promise<string | null> {
  const invoice = await prisma.billingInvoice.findUnique({
    where: { id: invoiceId },
    include: { items: true },
  });
  if (!invoice) return null;
  if (invoice.status !== "pending") return invoice.status;

  const status = await getLinkquClient().checkStatus(invoice.partnerReff);
  const data = status?.data;
  if (!data) return invoice.status;

  const statusTrx = String(data.status_trx ?? "").trim().toLowerCase();
  const statusPaid = String(data.status_paid ?? "").trim().toLowerCase();
  const paid = statusTrx === "success" || statusPaid === "paid" || statusPaid === "settle";
  if (!paid) return invoice.status;

  const paidAmount = Number(String(data.amount ?? "").replace(/[^\d]/g, ""));
  if (!Number.isFinite(paidAmount) || paidAmount !== Math.round(Number(invoice.amount))) {
    logger.warn(
      { invoiceId: String(invoice.id), paidAmount: data.amount, expected: Number(invoice.amount) },
      "[LinkQu] Status sync: nominal tidak cocok",
    );
    return invoice.status;
  }

  await prisma.billingPaymentEvent.create({
    data: {
      invoiceId: invoice.id,
      partnerReff: invoice.partnerReff,
      transactionId: null,
      status: statusTrx || statusPaid,
      signatureValid: true,
      payload: { source: "status_sync", ...status } as unknown as object,
    },
  });

  const result = await applyInvoiceOutcome(invoice, "paid", {
    rawStatus: statusTrx || statusPaid,
    transactionId: null,
    source: "status_sync",
  });
  return result.invoiceStatus;
}

async function applyInvoiceOutcome(
  invoice: InvoiceWithItems,
  mapped: "paid" | "expired" | "failed" | "pending",
  src: { rawStatus: string | null; transactionId: string | null; source: "callback" | "status_sync" },
) {
  const paid = mapped === "paid";
  const invoiceAmount = Number(invoice.amount);

  if (invoice.status === "paid") {
    return { ok: true, status: 200 as const, invoiceStatus: invoice.status };
  }

  const nextStatus = paid ? "paid" : mapped;

  if (nextStatus === "pending") {
    return { ok: true, status: 200 as const, invoiceStatus: invoice.status };
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Update bersyarat: callback ganda/bersamaan atau sinkron status yang berlomba hanya satu yang menang,
    // sehingga masa berlaku dan komisi tidak bertambah dua kali.
    const claimed = await tx.billingInvoice.updateMany({
      where: { id: invoice.id, status: { not: "paid" } },
      data: {
        status: nextStatus,
        paidAt: paid ? now : null,
        ...(src.transactionId ? { externalTransactionId: src.transactionId } : {}),
        metadata: {
          ...(typeof invoice.metadata === "object" && invoice.metadata
            ? (invoice.metadata as object)
            : {}),
          lastCallbackAt: now.toISOString(),
          lastCallbackStatus: src.rawStatus,
          lastCallbackSource: src.source,
        },
      },
    });
    if (claimed.count === 0) return;

    if (!paid) return;

    await accrueSubscriptionCommissionInTx(tx, {
      invoiceId: invoice.id,
      villageId: invoice.villageId,
      invoiceAmount: invoiceAmount,
      invoiceNumber: invoice.invoiceNumber,
      productType: invoice.productType,
      paidAt: now,
    });

    if (invoice.productType === "desa_package") {
      const tier = invoice.planCode as DesaPackageTier;
      let expiry = new Date(now);
      expiry.setFullYear(expiry.getFullYear() + 1);

      if (tier === LENGKAP_TIER) {
        // Lama langganan dari baris tagihan (bukan dari klien saat ini); perpanjangan menyambung sisa masa berlaku.
        const li = invoice.items.map((i) => i.metadata as { kind?: string; months?: number } | null).find((m) => m?.kind?.startsWith("lengkap_"));
        const months = parseRenewalMonths(li?.months ?? 12);
        const current = await tx.village.findUnique({ where: { id: invoice.villageId }, select: { subscriptionExpiry: true, subscriptionPlan: true } });
        expiry = lengkapNextExpiry({
          now, currentExpiry: current?.subscriptionExpiry ?? null, months,
          isRenewal: li?.kind === "lengkap_renewal" && String(current?.subscriptionPlan ?? "").toLowerCase() === LENGKAP_TIER,
        });
      }

      let storageLimit = arsipStorageLimitForDesaTierGb(tier);
      if (tier === LENGKAP_TIER) {
        // Perpanjangan tidak boleh menurunkan kuota yang sudah dibeli (add-on arsip) atau sudah dipakai.
        const cur = await tx.village.findUnique({ where: { id: invoice.villageId }, select: { storageLimit: true } });
        storageLimit = Math.max(storageLimit, cur?.storageLimit ?? 0);
      }

      await tx.village.update({
        where: { id: invoice.villageId },
        data: {
          subscriptionPlan: tier,
          subscriptionStatus: "active",
          subscriptionDate: now,
          subscriptionExpiry: expiry,
          storageLimit,
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

      // Berlangganan bulanan: kapasitas berlaku sampai masa berlaku; setelah itu kuota kembali ke kuota dasar paket.
      const existing = await tx.villageModuleSubscription.findUnique({
        where: { villageId_moduleCode: { villageId: invoice.villageId, moduleCode: ARSIP_ADDON_MODULE_CODE } },
        select: { planCode: true, status: true, expiryDate: true, startDate: true },
      });
      const active = isArsipAddonActive(existing) ? existing : null;
      const expiry = nextArsipExpiry({ now, active, tierCode: tier, months: monthsFromInvoiceItems(invoice.items) });
      await tx.villageModuleSubscription.upsert({
        where: { villageId_moduleCode: { villageId: invoice.villageId, moduleCode: ARSIP_ADDON_MODULE_CODE } },
        create: { villageId: invoice.villageId, moduleCode: ARSIP_ADDON_MODULE_CODE, planCode: tier, status: "active", startDate: now, expiryDate: expiry },
        update: {
          planCode: tier,
          status: "active",
          startDate: active && active.planCode === tier ? active.startDate : now,
          expiryDate: expiry,
        },
      });
    }

    if (invoice.productType === "absensi") {
      // Add-on kapasitas: tidak menyentuh paket desa. Satu baris per desa; perpanjangan tier sama menyambung masa berlaku.
      const code = invoice.planCode;
      const existing = await tx.villageModuleSubscription.findUnique({
        where: { villageId_moduleCode: { villageId: invoice.villageId, moduleCode: ATTENDANCE_CAPACITY_MODULE_CODE } },
        select: { planCode: true, status: true, expiryDate: true, startDate: true },
      });
      const stillActive =
        existing != null && existing.status === "active" && existing.expiryDate.getTime() > now.getTime();
      if (!isCapacityAddonCode(code)) throw new Error(`Kode kapasitas absensi tidak valid: ${code}`);
      const active =
        stillActive && isCapacityAddonCode(existing.planCode)
          ? { code: existing.planCode, expiresAt: existing.expiryDate }
          : null;
      const expiry = nextCapacityExpiry({ now, active, code, months: monthsFromInvoiceItems(invoice.items) });
      const sameTier = stillActive && existing.planCode === code;
      await tx.villageModuleSubscription.upsert({
        where: { villageId_moduleCode: { villageId: invoice.villageId, moduleCode: ATTENDANCE_CAPACITY_MODULE_CODE } },
        create: { villageId: invoice.villageId, moduleCode: ATTENDANCE_CAPACITY_MODULE_CODE, planCode: code, status: "active", startDate: now, expiryDate: expiry },
        update: { planCode: code, status: "active", startDate: sameTier ? existing.startDate : now, expiryDate: expiry },
      });
    }

    if (invoice.productType === "absensi_gps_addon") {
      const current = await tx.village.findUnique({
        where: { id: invoice.villageId },
        select: { absensiGpsAddonActive: true, absensiGpsAddonExpiry: true },
      });
      // Flag aktif tanpa expiry (desa lama) tidak diberi batas baru oleh pembayaran ini.
      const unlimited = current?.absensiGpsAddonActive === true && current.absensiGpsAddonExpiry == null;
      await tx.village.update({
        where: { id: invoice.villageId },
        data: {
          absensiGpsAddonActive: true,
          ...(unlimited
            ? {}
            : { absensiGpsAddonExpiry: nextGpsAddonExpiry({ now, currentExpiry: current?.absensiGpsAddonExpiry, months: monthsFromInvoiceItems(invoice.items) }) }),
        },
      });
    }

    if (invoice.productType === "ai_credits") {
      const meta =
        invoice.metadata && typeof invoice.metadata === "object"
          ? (invoice.metadata as Record<string, unknown>)
          : null;
      const targetUserId = meta?.userId ? Number(meta.userId) : null;
      const creditsToAdd = meta?.credits ? Number(meta.credits) : null;

      if (
        targetUserId &&
        creditsToAdd != null &&
        Number.isFinite(creditsToAdd) &&
        creditsToAdd > 0
      ) {
        await tx.user.update({
          where: { id: targetUserId },
          data: { aiCredits: { increment: creditsToAdd } },
        });
      }
    }

    if (invoice.productType === "website_custom") {
      // Masa aktif dikendalikan di sini: perpanjangan menyambung sisa waktu, pembelian pertama / yang sudah habis mulai dari sekarang.
      const existing = await tx.villageModuleSubscription.findUnique({
        where: { villageId_moduleCode: { villageId: invoice.villageId, moduleCode: WEBSITE_CUSTOM_MODULE_CODE } },
        select: { status: true, expiryDate: true, startDate: true },
      });
      const stillActive = existing != null && isWebsiteCustomActive(existing, now.getTime());
      const expiry = nextWebsiteCustomExpiry({
        now,
        currentExpiry: existing?.expiryDate ?? null,
        months: monthsFromInvoiceItems(invoice.items),
      });
      await tx.villageModuleSubscription.upsert({
        where: { villageId_moduleCode: { villageId: invoice.villageId, moduleCode: WEBSITE_CUSTOM_MODULE_CODE } },
        create: { villageId: invoice.villageId, moduleCode: WEBSITE_CUSTOM_MODULE_CODE, planCode: WEBSITE_CUSTOM_PLAN_CODE, status: "active", startDate: now, expiryDate: expiry },
        update: { status: "active", startDate: stillActive ? existing.startDate : now, expiryDate: expiry },
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

      const existingSub = await tx.websiteSubscription.findUnique({
        where: { villageId: invoice.villageId },
        select: { templateId: true, expiryDate: true },
      });
      const sameTemplate = existingSub?.templateId === templateId;
      const expiry = nextWebsiteExpiry({
        now,
        currentExpiry: existingSub?.expiryDate ?? null,
        sameTemplate,
      });

      // Alamat hanya didaftarkan pada aktivasi pertama; ganti template/perpanjangan tidak mengubah domain.
      if (!existingSub) {
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

        if (domainType === "subdomain" && domainValue) {
          const r = await registerPrimarySubdomainInTx(tx, { villageId: invoice.villageId, label: domainValue });
          if (!r.ok) logger.warn({ invoiceId: String(invoice.id), error: r.error }, "website subdomain not registered");
        } else if (domainType === "custom" && domainValue) {
          const r = await registerPendingCustomDomainInTx(tx, { villageId: invoice.villageId, hostname: domainValue });
          if (!r.ok) logger.warn({ invoiceId: String(invoice.id), error: r.error }, "website custom domain not registered");
        }
      }

      await tx.websiteSubscription.upsert({
        where: { villageId: invoice.villageId },
        create: {
          villageId: invoice.villageId,
          templateId: templateId,
          startDate: now,
          expiryDate: expiry,
          isActive: true,
        },
        update: {
          templateId: templateId,
          startDate: sameTemplate ? undefined : now,
          expiryDate: expiry,
          isActive: true,
          // Perpanjangan mempertahankan hasil kerja CMS; hanya ganti template yang mengosongkan kustomisasi.
          ...(sameTemplate ? {} : { customization: Prisma.DbNull }),
        },
      });
    }

    if (invoice.productType === "module_addon") {
      const moduleCode = invoice.planCode;
      // Perpanjangan menyambung dari masa berlaku yang masih berjalan (sisa waktu tidak hangus).
      const existingModule = await tx.villageModuleSubscription.findUnique({
        where: { villageId_moduleCode: { villageId: invoice.villageId, moduleCode } },
        select: { status: true, expiryDate: true },
      });
      const stillActiveModule =
        existingModule != null &&
        existingModule.status === "active" &&
        existingModule.expiryDate.getTime() > now.getTime();
      const expiry = addMonths(stillActiveModule ? existingModule.expiryDate : now, monthsFromInvoiceItems(invoice.items));

      await tx.villageModuleSubscription.upsert({
        where: {
          villageId_moduleCode: {
            villageId: invoice.villageId,
            moduleCode,
          },
        },
        create: {
          villageId: invoice.villageId,
          moduleCode,
          planCode: "default",
          status: "active",
          startDate: now,
          expiryDate: expiry,
        },
        update: {
          status: "active",
          startDate: now,
          expiryDate: expiry,
        },
      });
    }
  });

  return { ok: true, status: 200 as const, invoiceStatus: nextStatus };
}
