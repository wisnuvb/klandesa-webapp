/**
 * Pemberitahuan ke pemilik platform (email via Brevo) untuk dua peristiwa bisnis:
 *  - desa baru mendaftar (akun trial);
 *  - pembayaran tagihan lunas (kecuali Website Desa Kustom, yang sudah punya email sendiri: lib/website-service/order-notification.ts).
 *
 * Aturan: tidak pernah melempar galat dan tidak pernah menahan pendaftaran/pemrosesan pembayaran (panggil dengan `void`);
 * pengiriman lewat `sendTransactional` sehingga ikut anggaran kuota harian dan tidak menggerus cadangan email kritis;
 * isi email tidak memuat kata sandi, token, atau NIK.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { formatIdr } from "@/lib/billing/catalog";
import { sendTransactional } from "@/lib/email/send";
import { escapeHtml } from "@/lib/email/render";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";

/** Penerima bawaan; env OWNER_NOTIFY_EMAIL menggantikannya (boleh beberapa alamat dipisah koma). */
export const DEFAULT_OWNER_RECIPIENT = "wisnuvb@gmail.com";

export function ownerRecipients(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.OWNER_NOTIFY_EMAIL?.trim() || DEFAULT_OWNER_RECIPIENT;
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s));
  return list.length > 0 ? list : [DEFAULT_OWNER_RECIPIENT];
}

type Rows = Array<[string, string]>;

function formatWib(d: Date): string {
  return `${d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} WIB`;
}

function formatDay(d: Date | null): string {
  return d ? d.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric" }) : "-";
}

function render(subject: string, headline: string, rows: Rows) {
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

export type VillageRegisteredInput = {
  villageName: string;
  villageCode: string;
  district: string;
  regency: string;
  province: string;
  headName: string;
  email: string | null;
  phone: string | null;
  referralCode: string | null;
  trialDays: number;
  trialExpiry: Date | null;
  registeredAt: Date;
};

export function buildVillageRegisteredEmail(i: VillageRegisteredInput) {
  return render(
    `[Klandesa] Desa baru daftar (trial): ${i.villageName}`,
    `Desa baru mendaftar akun trial ${i.trialDays} hari.`,
    [
      ["Desa", `${i.villageName} (${i.villageCode})`],
      ["Lokasi", `Kec. ${i.district}, ${i.regency}, ${i.province}`],
      ["Nama pendaftar", i.headName],
      ["Email", i.email || "-"],
      ["Telepon", i.phone || "-"],
      ["Kode referral", i.referralCode || "-"],
      ["Trial sampai", formatDay(i.trialExpiry)],
      ["Mendaftar pada", formatWib(i.registeredAt)],
    ],
  );
}

export type PaymentPaidInput = {
  villageName: string;
  villageCode: string;
  villageEmail: string | null;
  villagePhone: string | null;
  invoiceNumber: string;
  productType: string;
  planCode: string;
  items: string[];
  amount: number;
  paidAt: Date;
  /** true = tagihan lunas pertama desa ini (kemungkinan konversi dari trial). */
  firstPayment: boolean;
  subscriptionStatus: string;
  subscriptionExpiry: Date | null;
};

export function buildPaymentPaidEmail(i: PaymentPaidInput) {
  const headline = i.firstPayment
    ? "Pembayaran pertama dari desa ini sudah lunas (konversi dari trial)."
    : "Pembayaran sudah lunas.";
  return render(
    `[Klandesa] Pembayaran lunas ${formatIdr(i.amount)}: ${i.villageName}`,
    headline,
    [
      ["Desa", `${i.villageName} (${i.villageCode})`],
      ["Email desa", i.villageEmail || "-"],
      ["Telepon desa", i.villagePhone || "-"],
      ["Nomor tagihan", i.invoiceNumber],
      ["Produk", `${i.productType} / ${i.planCode}`],
      ["Rincian", i.items.length > 0 ? i.items.join("; ") : "-"],
      ["Jumlah dibayar", formatIdr(i.amount)],
      ["Dibayar pada", formatWib(i.paidAt)],
      ["Status langganan desa", i.subscriptionStatus],
      ["Langganan sampai", formatDay(i.subscriptionExpiry)],
    ],
  );
}

async function deliver(content: { subject: string; html: string; text: string }, context: Record<string, unknown>) {
  for (const to of ownerRecipients()) {
    const res = await sendTransactional({ template: "owner-notify", to, content });
    // "not-configured" = Brevo belum diisi (wajar di lokal); sendTransactional sudah mencetak isinya saat pengembangan.
    if (!res.ok && res.reason !== "not-configured") {
      logger.warn({ ...context, reason: res.reason, error: res.error }, "[owner-notify] email pemilik tidak terkirim");
    }
  }
}

/** Desa baru mendaftar. Dibatasi 30 email/jam agar lonjakan atau pendaftaran massal tidak menguras kuota email. */
export async function notifyOwnerVillageRegistered(input: VillageRegisteredInput): Promise<void> {
  try {
    const rl = await checkRateLimitDb(limiterKey("owner-notify-signup", "all"), { max: 30, windowMs: 60 * 60_000 });
    if (!rl.ok) return;
    await deliver(buildVillageRegisteredEmail(input), { event: "village-registered", villageCode: input.villageCode });
  } catch (e) {
    logger.warn({ event: "village-registered", err: e instanceof Error ? e.message : String(e) }, "[owner-notify] gagal menyiapkan email pemilik");
  }
}

/** Tagihan lunas. Dipanggil sekali per tagihan (hanya pemenang klaim "paid"); Website Desa Kustom dilewati (email sendiri). */
export async function notifyOwnerPaymentPaid(invoiceId: bigint | number): Promise<void> {
  try {
    const invoice = await prisma.billingInvoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        villageId: true,
        invoiceNumber: true,
        productType: true,
        planCode: true,
        amount: true,
        paidAt: true,
        items: { select: { name: true, quantity: true } },
      },
    });
    if (!invoice || invoice.productType === "website_custom") return;

    const [village, earlierPaid] = await Promise.all([
      prisma.village.findUnique({
        where: { id: invoice.villageId },
        select: { name: true, code: true, email: true, phone: true, subscriptionStatus: true, subscriptionExpiry: true },
      }),
      prisma.billingInvoice.count({ where: { villageId: invoice.villageId, status: "paid", id: { not: invoice.id } } }),
    ]);
    if (!village) return;

    await deliver(
      buildPaymentPaidEmail({
        villageName: village.name,
        villageCode: village.code,
        villageEmail: village.email,
        villagePhone: village.phone,
        invoiceNumber: invoice.invoiceNumber,
        productType: invoice.productType,
        planCode: invoice.planCode,
        items: invoice.items.map((it) => (it.quantity > 1 ? `${it.name} x${it.quantity}` : it.name)),
        amount: Number(invoice.amount),
        paidAt: invoice.paidAt ?? new Date(),
        firstPayment: earlierPaid === 0,
        subscriptionStatus: village.subscriptionStatus,
        subscriptionExpiry: village.subscriptionExpiry,
      }),
      { event: "payment-paid", invoiceId: String(invoiceId) },
    );
  } catch (e) {
    logger.warn({ event: "payment-paid", invoiceId: String(invoiceId), err: e instanceof Error ? e.message : String(e) }, "[owner-notify] gagal menyiapkan email pemilik");
  }
}
