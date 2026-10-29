import type { Prisma, PrismaClient } from "@prisma/client";
import { BILLING_CATALOG, type BillingProductType } from "@/lib/billing/catalog";
import {
  DEFAULT_PARTNER_CLOSING_BONUS_IDR,
  DEFAULT_PARTNER_CLOSING_BONUS_PERCENT,
  DEFAULT_PARTNER_SUBSCRIPTION_SHARE_PERCENT,
} from "@/lib/partner/defaults";
import { closingBonusFor, subscriptionShareFor } from "@/lib/partner/commission-math";

/** Tipe ledger komisi mitra — harus sama dengan nilai persist di DB (`PartnerCommissionEntry.type`). */
export const PARTNER_COMMISSION_TYPES = ["CLOSING", "SUBSCRIPTION", "ADJUSTMENT"] as const;
export type PartnerCommissionType = (typeof PARTNER_COMMISSION_TYPES)[number];

/** Status ledger — harus sama dengan nilai persist di DB (`PartnerCommissionEntry.status`). */
export const PARTNER_COMMISSION_STATUSES = [
  "accrued",
  "approved",
  "disbursed",
  "cancelled",
] as const;
export type PartnerCommissionStatus = (typeof PARTNER_COMMISSION_STATUSES)[number];

/** Produk invoice yang menghasilkan komisi bagi hasil bagi mitra. */
export const PARTNER_ELIGIBLE_BILLING_PRODUCTS: BillingProductType[] = [
  "desa_package",
  "absensi",
  "absensi_gps_addon",
  "arsip",
  "website",
];

function isEligibleProduct(productType: string): productType is BillingProductType {
  return PARTNER_ELIGIBLE_BILLING_PRODUCTS.includes(productType as BillingProductType);
}

export type DbTx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

/**
 * Pastikan ada skema bagi hasil aktif untuk mitra (buat default jika belum ada).
 */
export async function ensurePartnerCommissionRule(
  tx: DbTx | PrismaClient,
  partnerId: number,
): Promise<{
  closingBonusAmount: Prisma.Decimal;
  closingBonusPercent: Prisma.Decimal | null;
  subscriptionSharePercent: Prisma.Decimal;
  isActive: boolean;
}> {
  const existing = await tx.partnerCommissionRule.findUnique({
    where: { partnerId },
  });
  if (existing) return existing;

  const created = await tx.partnerCommissionRule.create({
    data: {
      partnerId,
      closingBonusAmount: DEFAULT_PARTNER_CLOSING_BONUS_IDR,
      closingBonusPercent: DEFAULT_PARTNER_CLOSING_BONUS_PERCENT,
      subscriptionSharePercent: DEFAULT_PARTNER_SUBSCRIPTION_SHARE_PERCENT,
    },
  });
  return created;
}

/** Accrual bonus closing (% dari harga Paket Lengkap yang berlaku) ketika admin pertama kali menautkan desa ke mitra (dalam transaksi DB yang sama). */
export async function accrueClosingCommissionInTx(
  tx: DbTx,
  params: { partnerId: number; villageId: number },
): Promise<void> {
  const rule = await ensurePartnerCommissionRule(tx, params.partnerId);
  if (!rule.isActive) return;

  const bonus = closingBonusFor(
    {
      closingBonusPercent: rule.closingBonusPercent == null ? null : Number(rule.closingBonusPercent),
      closingBonusAmount: Number(rule.closingBonusAmount),
    },
    BILLING_CATALOG.desa_package.tiers.lengkap.setupFee,
  );
  if (bonus <= 0) return;

  await tx.partnerCommissionEntry.create({
    data: {
      partnerId: params.partnerId,
      villageId: params.villageId,
      type: "CLOSING",
      amount: bonus,
      currency: "IDR",
      status: "accrued",
      description: "Komisi closing desa (pertama tertaut)",
    },
  });
}

/** Accrual % dari invoice yang sudah paid (idempotent per `invoiceId`; dalam transaksi DB yang sama). */
export async function accrueSubscriptionCommissionInTx(
  tx: DbTx,
  params: {
    invoiceId: bigint;
    villageId: number;
    invoiceAmount: number;
    invoiceNumber: string;
    productType: string;
    paidAt: Date;
  },
): Promise<void> {
  const village = await tx.village.findUnique({
    where: { id: params.villageId },
    select: { acquiredByPartnerId: true },
  });
  const partnerId = village?.acquiredByPartnerId;
  if (partnerId == null) return;

  if (!isEligibleProduct(params.productType)) return;

  const existingByInvoice = await tx.partnerCommissionEntry.findFirst({
    where: { sourceInvoiceId: params.invoiceId },
    select: { id: true },
  });
  if (existingByInvoice) return;

  const rule = await ensurePartnerCommissionRule(tx, partnerId);
  if (!rule.isActive) return;

  const share = subscriptionShareFor(params.invoiceAmount, Number(rule.subscriptionSharePercent));
  if (share <= 0) return;

  await tx.partnerCommissionEntry.create({
    data: {
      partnerId,
      villageId: params.villageId,
      type: "SUBSCRIPTION",
      sourceInvoiceId: params.invoiceId,
      amount: share,
      currency: "IDR",
      status: "accrued",
      description: `Bagi hasil langganan (${params.productType}) — ${params.invoiceNumber}`,
      periodStart: params.paidAt,
      periodEnd: params.paidAt,
    },
  });
}
