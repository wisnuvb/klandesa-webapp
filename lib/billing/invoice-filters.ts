import type { Prisma } from "@prisma/client";

export const INVOICE_STATUS_FILTERS = ["pending", "paid", "expired", "failed"] as const;
export type InvoiceStatusFilter = (typeof INVOICE_STATUS_FILTERS)[number];

export function isInvoiceStatusFilter(v: unknown): v is InvoiceStatusFilter {
  return (INVOICE_STATUS_FILTERS as readonly unknown[]).includes(v);
}

/**
 * Status yang ditampilkan: tagihan "pending" yang lewat batas bayar dianggap kedaluwarsa
 * (status di database baru berubah bila callback expired masuk, jadi tidak bisa diandalkan sendirian).
 */
export function displayInvoiceStatus(status: string, expiresAt: Date | null, now: number): string {
  const s = status.toLowerCase();
  if (s === "pending" && expiresAt && expiresAt.getTime() <= now) return "expired";
  return s;
}

/** Filter Prisma yang konsisten dengan `displayInvoiceStatus`. */
export function invoiceStatusWhere(filter: InvoiceStatusFilter, now: Date): Prisma.BillingInvoiceWhereInput {
  if (filter === "pending") {
    return { status: "pending", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
  }
  if (filter === "expired") {
    return { OR: [{ status: "expired" }, { status: "pending", expiresAt: { lte: now } }] };
  }
  return { status: filter };
}
