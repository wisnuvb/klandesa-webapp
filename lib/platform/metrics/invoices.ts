/** Daftar tagihan untuk konsol owner: parsing parameter, filter Prisma, label produk, dan CSV. Tanpa payload mentah. */
import type { Prisma } from "@prisma/client";
import { displayInvoiceStatus, invoiceStatusWhere, isInvoiceStatusFilter, type InvoiceStatusFilter } from "@/lib/billing/invoice-filters";
import { csvSafeCell } from "@/lib/csv-safe";
import { formatSortableWib } from "./format";
import { parseRevenueRange, resolveRevenueRange, type RevenueRange } from "./period";

export const INVOICE_PAGE_SIZE = 25;
export const INVOICE_PAGE_SIZE_MAX = 50;
export const INVOICE_MAX_PAGE = 10_000;
export const INVOICE_EXPORT_MAX_ROWS = 5_000;
export const INVOICE_QUERY_MAX_LEN = 60;

export const PRODUCT_LABEL: Record<string, string> = {
  desa_package: "Paket Desa",
  absensi: "Absensi",
  absensi_gps_addon: "Add-on GPS Absensi",
  arsip: "Arsip Digital",
  website: "Website (lama)",
  website_custom: "Website Desa Kustom",
  ai_credits: "Kredit AI",
  module_addon: "Add-on Modul",
};

export function productLabel(productType: string): string {
  return PRODUCT_LABEL[productType] ?? productType;
}

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  paid: "Lunas",
  pending: "Menunggu bayar",
  expired: "Kedaluwarsa",
  failed: "Gagal",
};

export type InvoiceListQuery = {
  status: InvoiceStatusFilter | null;
  q: string;
  page: number;
  pageSize: number;
  range: RevenueRange | null;
};

export type InvoiceQueryParseResult = { ok: true; value: InvoiceListQuery } | { ok: false; error: string };

/** Validasi parameter query (tidak pernah melempar). Status/range tak dikenal = galat 400, bukan diabaikan diam-diam. */
export function parseInvoiceQuery(sp: URLSearchParams): InvoiceQueryParseResult {
  const statusRaw = sp.get("status")?.trim();
  let status: InvoiceStatusFilter | null = null;
  if (statusRaw) {
    if (!isInvoiceStatusFilter(statusRaw)) return { ok: false, error: "Status tagihan tidak valid." };
    status = statusRaw;
  }
  const rangeRaw = sp.get("range")?.trim();
  let range: RevenueRange | null = null;
  if (rangeRaw) {
    range = parseRevenueRange(rangeRaw);
    if (!range) return { ok: false, error: "Rentang waktu tidak valid." };
  }
  const q = (sp.get("q") ?? "").trim().slice(0, INVOICE_QUERY_MAX_LEN);

  const pageRaw = sp.get("page");
  let page = 1;
  if (pageRaw != null && pageRaw !== "") {
    if (!/^\d{1,5}$/.test(pageRaw)) return { ok: false, error: "Nomor halaman tidak valid." };
    page = Number(pageRaw);
    if (page < 1 || page > INVOICE_MAX_PAGE) return { ok: false, error: "Nomor halaman tidak valid." };
  }
  const sizeRaw = sp.get("pageSize");
  let pageSize = INVOICE_PAGE_SIZE;
  if (sizeRaw != null && sizeRaw !== "") {
    if (!/^\d{1,4}$/.test(sizeRaw)) return { ok: false, error: "Ukuran halaman tidak valid." };
    pageSize = Math.min(Math.max(Number(sizeRaw), 1), INVOICE_PAGE_SIZE_MAX);
  }
  return { ok: true, value: { status, q, page, pageSize, range } };
}

/**
 * Filter Prisma. Pencarian memakai AWALAN (LIKE 'x%') pada nomor tagihan (unik, berindeks), kode desa (berindeks), atau nama desa.
 * Rentang waktu: tagihan lunas diukur dari tanggal bayar; status lain dari tanggal dibuat.
 */
export function invoiceListWhere(query: Pick<InvoiceListQuery, "status" | "q" | "range">, now: Date): Prisma.BillingInvoiceWhereInput {
  const and: Prisma.BillingInvoiceWhereInput[] = [];
  if (query.status) and.push(invoiceStatusWhere(query.status, now));
  if (query.q) {
    and.push({
      OR: [
        { invoiceNumber: { startsWith: query.q } },
        { village: { code: { startsWith: query.q } } },
        { village: { name: { startsWith: query.q } } },
      ],
    });
  }
  if (query.range) {
    const r = resolveRevenueRange(query.range, now);
    const window = { gte: r.from, lt: r.to };
    and.push(query.status === "paid" ? { paidAt: window } : { createdAt: window });
  }
  return and.length ? { AND: and } : {};
}

/** Kolom yang boleh dibaca: TIDAK ada rawResponse/metadata/payment URL/QR/VA. */
export const invoiceListSelect = {
  id: true,
  invoiceNumber: true,
  villageId: true,
  productType: true,
  planCode: true,
  amount: true,
  status: true,
  paymentMethod: true,
  expiresAt: true,
  paidAt: true,
  createdAt: true,
  village: { select: { name: true, code: true } },
} satisfies Prisma.BillingInvoiceSelect;

export type InvoiceListRow = Prisma.BillingInvoiceGetPayload<{ select: typeof invoiceListSelect }>;

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  villageId: number;
  villageName: string;
  villageCode: string;
  productType: string;
  product: string;
  planCode: string;
  amount: number;
  status: string;
  statusLabel: string;
  paymentMethod: string | null;
  createdAt: string;
  paidAt: string | null;
};

export function toInvoiceListItem(r: InvoiceListRow, now: Date): InvoiceListItem {
  const status = displayInvoiceStatus(r.status, r.expiresAt, now.getTime());
  return {
    id: String(r.id),
    invoiceNumber: r.invoiceNumber,
    villageId: r.villageId,
    villageName: r.village.name,
    villageCode: r.village.code,
    productType: r.productType,
    product: productLabel(r.productType),
    planCode: r.planCode,
    amount: Number(r.amount),
    status,
    statusLabel: INVOICE_STATUS_LABEL[status] ?? status,
    paymentMethod: r.paymentMethod,
    createdAt: r.createdAt.toISOString(),
    paidAt: r.paidAt ? r.paidAt.toISOString() : null,
  };
}

export const INVOICE_CSV_HEADERS = [
  "Nomor Tagihan", "Desa", "Kode Desa", "Produk", "Paket", "Jumlah (Rp)", "Status", "Metode Bayar", "Dibuat (WIB)", "Dibayar (WIB)",
] as const;

/** CSV aman rumus (csvSafeCell): nama desa yang diawali = + - @ dinetralkan. Jumlah tetap angka. BOM agar Excel membaca UTF-8. */
export function buildInvoiceCsv(items: InvoiceListItem[]): string {
  const lines = [INVOICE_CSV_HEADERS.map((h) => csvSafeCell(h)).join(",")];
  for (const it of items) {
    lines.push(
      [
        it.invoiceNumber, it.villageName, it.villageCode, it.product, it.planCode, Math.round(it.amount), it.statusLabel,
        it.paymentMethod ?? "", formatSortableWib(it.createdAt), formatSortableWib(it.paidAt),
      ].map((v) => csvSafeCell(v)).join(","),
    );
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}
