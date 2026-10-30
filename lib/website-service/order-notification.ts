/**
 * Pemberitahuan ke pemilik saat pesanan Website Desa Kustom lunas (email via Brevo).
 * Dipicu dari applyInvoiceOutcome tepat satu kali per tagihan (hanya pemenang klaim "paid"); kegagalan kirim tidak
 * pernah menggagalkan pemrosesan pembayaran.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { escapeHtml } from "@/lib/html-escape";
import { formatIdr } from "@/lib/billing/catalog";
import { isBrevoConfigured, sendBrevoEmail } from "@/lib/email/brevo";
import { WEBSITE_CUSTOM_MODULE_CODE } from "@/lib/website-service/subscription";

/** Penerima default; env WEBSITE_ORDER_NOTIFY_EMAIL menggantikannya (boleh beberapa alamat dipisah koma). */
const DEFAULT_RECIPIENT = "wisnuvb@gmail.com";

export type WebsiteOrderEmailInput = {
  villageName: string;
  villageCode: string;
  villagePhone: string | null;
  villageEmail: string | null;
  invoiceNumber: string;
  amount: number;
  paidAt: Date;
  /** first = pesanan baru (perlu mulai dikerjakan); renewal = perpanjangan. */
  kind: "first" | "renewal";
  months: number;
  expiry: Date | null;
};

function formatWib(d: Date, withTime = false): string {
  return d.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function buildWebsiteOrderEmail(i: WebsiteOrderEmailInput): { subject: string; html: string; text: string } {
  const isFirst = i.kind === "first";
  const subject = isFirst
    ? `[Klandesa] Pesanan website baru (lunas): ${i.villageName}`
    : `[Klandesa] Perpanjangan website (lunas): ${i.villageName}`;
  const headline = isFirst
    ? "Pesanan Website Desa Kustom baru sudah lunas. Hubungi desa untuk memulai pengerjaan."
    : `Perpanjangan Website Desa Kustom ${i.months} bulan sudah lunas. Tidak ada pengerjaan baru.`;
  const rows: Array<[string, string]> = [
    ["Desa", `${i.villageName} (${i.villageCode})`],
    ["Telepon desa", i.villagePhone || "-"],
    ["Email desa", i.villageEmail || "-"],
    ["Nomor tagihan", i.invoiceNumber],
    ["Jumlah dibayar", formatIdr(i.amount)],
    ["Dibayar pada", `${formatWib(i.paidAt, true)} WIB`],
    ["Masa aktif sampai", i.expiry ? formatWib(i.expiry) : "-"],
  ];
  const text = [headline, "", ...rows.map(([k, v]) => `${k}: ${v}`)].join("\n");
  const html =
    `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111827;max-width:560px">` +
    `<h2 style="font-size:18px;margin:0 0 12px">${escapeHtml(headline)}</h2>` +
    `<table style="border-collapse:collapse;width:100%">` +
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td>` +
          `<td style="padding:6px 0">${escapeHtml(v)}</td></tr>`,
      )
      .join("") +
    `</table></div>`;
  return { subject, html, text };
}

function recipients(): string[] {
  const raw = process.env.WEBSITE_ORDER_NOTIFY_EMAIL?.trim() || DEFAULT_RECIPIENT;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Kirim pemberitahuan; tidak pernah melempar galat. Jangan di-await dari jalur webhook. */
export async function notifyWebsiteOrderPaid(invoiceId: bigint | number): Promise<void> {
  try {
    if (!isBrevoConfigured()) {
      logger.warn({ invoiceId: String(invoiceId) }, "[website-order] Brevo belum dikonfigurasi, email pesanan tidak dikirim");
      return;
    }
    const invoice = await prisma.billingInvoice.findUnique({
      where: { id: invoiceId },
      select: {
        invoiceNumber: true,
        amount: true,
        paidAt: true,
        villageId: true,
        items: { select: { metadata: true } },
      },
    });
    if (!invoice) return;

    const [village, sub] = await Promise.all([
      prisma.village.findUnique({
        where: { id: invoice.villageId },
        select: { name: true, code: true, phone: true, email: true },
      }),
      prisma.villageModuleSubscription.findUnique({
        where: { villageId_moduleCode: { villageId: invoice.villageId, moduleCode: WEBSITE_CUSTOM_MODULE_CODE } },
        select: { expiryDate: true },
      }),
    ]);
    if (!village) return;

    const meta = invoice.items
      .map((it) => it.metadata as { kind?: string; months?: number } | null)
      .find((m) => m?.kind?.startsWith("website_custom_"));
    const content = buildWebsiteOrderEmail({
      villageName: village.name,
      villageCode: village.code,
      villagePhone: village.phone,
      villageEmail: village.email,
      invoiceNumber: invoice.invoiceNumber,
      amount: Number(invoice.amount),
      paidAt: invoice.paidAt ?? new Date(),
      kind: meta?.kind === "website_custom_renewal" ? "renewal" : "first",
      months: meta?.months ?? 12,
      expiry: sub?.expiryDate ?? null,
    });

    for (const to of recipients()) {
      const res = await sendBrevoEmail({ to, ...content });
      if (!res.ok) logger.warn({ invoiceId: String(invoiceId), error: res.error }, "[website-order] email pesanan gagal terkirim");
    }
  } catch (e) {
    logger.warn({ invoiceId: String(invoiceId), err: e instanceof Error ? e.message : String(e) }, "[website-order] gagal menyiapkan email pesanan");
  }
}
