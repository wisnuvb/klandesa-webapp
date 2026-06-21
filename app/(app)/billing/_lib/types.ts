import type { PackageTier } from "@/lib/modules/entitlements";

export type BillingStatusInvoice = {
  id: string;
  invoiceNumber: string;
  productType: string;
  planCode: string;
  amount: number;
  status: string;
  paymentMethod: string | null;
  paymentUrl: string | null;
  qrContent: string | null;
  qrImageUrl: string | null;
  vaNumber: string | null;
  bankCode: string | null;
  createdAt: string;
  expiresAt: string | null;
  paidAt: string | null;
};

export type BillingStatusResponse = {
  village: {
    id: number;
    code: string;
    name: string;
    onboardingCompletedAt?: string | null;
  };
  subscription: {
    active: boolean;
    writable?: boolean;
    paid?: boolean;
    phase?: string;
    daysRemaining?: number | null;
    expiringSoon?: boolean;
    plan: string | null;
    status: string | null;
    startDate: string | null;
    expiry: string | null;
  };
  entitlements:
    | {
        desaTier: string;
        absensiTier: string;
        arsipTier: string;
        arsipStorageLimitGb: number;
      }
    | null;
  modules?: Record<
    string,
    {
      entitled: boolean;
      source: string | null;
      minPackageTier: PackageTier;
      addonMonthlyFee: number | null;
      locked: boolean;
      addonExpiry?: string | null;
      addonDaysRemaining?: number | null;
    }
  >;
  invoices: BillingStatusInvoice[];
};

export type CheckoutInvoiceItem = {
  id: string;
  name: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
};

export type CheckoutInvoice = {
  id: string;
  invoiceNumber: string;
  productType: string;
  planCode: string;
  amount: number;
  status: string;
  expiresAt: string | null;
  paymentMethod: string | null;
  paymentUrl: string | null;
  qrContent: string | null;
  qrImageUrl: string | null;
  vaNumber: string | null;
  bankCode: string | null;
  createdAt: string;
  items: CheckoutInvoiceItem[];
};

export type CheckoutResponse = {
  reused?: boolean;
  invoice: CheckoutInvoice;
};

export type VaBank = {
  id: string;
  label: string;
  linkquBankCode: string;
};
