import { linkquBankLabel } from "@/lib/payment/linkqu-channels";

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu pembayaran",
  paid: "Lunas",
  expired: "Kedaluwarsa",
  failed: "Gagal",
  cancelled: "Dibatalkan",
};

export const PRODUCT_LABEL: Record<string, string> = {
  desa_package: "Paket Desa",
  absensi: "Kapasitas Absensi",
  absensi_gps_addon: "Add-on GPS Radius",
  arsip: "Penyimpanan Arsip",
  module_addon: "Modul Add-on",
  website: "Website Desa",
  ai_credits: "Kredit Asisten AI",
};

export const METHOD_LABEL: Record<string, string> = {
  qris: "QRIS",
  va: "Virtual Account",
  ewallet: "E-Wallet",
};

export function invoiceStatusLabel(status: string): string {
  return INVOICE_STATUS_LABEL[status.toLowerCase()] ?? status;
}

export function productLabel(productType: string): string {
  return PRODUCT_LABEL[productType] ?? productType;
}

/** "Virtual Account BRI" / "QRIS" / "E-Wallet" untuk ditampilkan di baris riwayat. */
export function methodSummary(inv: { paymentMethod: string | null; bankCode: string | null }): string {
  const base = METHOD_LABEL[inv.paymentMethod ?? ""] ?? "-";
  if (inv.paymentMethod === "va" && inv.bankCode) {
    return `${base} ${linkquBankLabel(inv.bankCode) ?? `(kode ${inv.bankCode})`}`;
  }
  return base;
}
