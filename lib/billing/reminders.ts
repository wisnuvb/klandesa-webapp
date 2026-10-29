/**
 * Pengingat masa berlaku langganan (email via Brevo + notifikasi dalam aplikasi). Murni, tanpa DB/jaringan.
 * Dijalankan harian oleh /api/cron/subscription-reminders; `sourceKey` dipakai sebagai penanda "sudah terkirim".
 */
import { formatIdr, BILLING_CATALOG } from "./catalog";
import { isLengkapPlan } from "./lengkap";

const DAY_MS = 24 * 60 * 60 * 1000;

export const TRIAL_REMINDER_DAYS = [1, 3, 7] as const;
export const PAID_REMINDER_DAYS = [1, 7, 30] as const;
export const ARSIP_REMINDER_DAYS = [1, 7] as const;
/** Pemberitahuan "sudah berakhir" hanya dikirim bila berakhirnya belum lebih dari ini. */
export const ENDED_WINDOW_DAYS = 3;

export type ReminderAudience = "trial" | "paid" | "arsip";
export type ReminderStage = "upcoming" | "ended";

export type ReminderPlan = {
  audience: ReminderAudience;
  stage: ReminderStage;
  /** Hari tersisa (dibulatkan ke atas) untuk stage upcoming; null untuk ended. */
  daysRemaining: number | null;
  expiry: Date;
  /** Unik per desa; dipakai sebagai kunci dedup di AdminNotification. */
  sourceKey: string;
};

function daysUntil(expiry: Date, now: Date): number {
  return Math.ceil((expiry.getTime() - now.getTime()) / DAY_MS);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Bucket terkecil yang masih >= sisa hari (mis. sisa 5 hari dan bucket 1/7/30 → 7); null bila lebih jauh dari semua bucket. */
export function pickBucket(daysRemaining: number, buckets: readonly number[]): number | null {
  const sorted = [...buckets].sort((a, b) => a - b);
  return sorted.find((b) => daysRemaining <= b) ?? null;
}

function endedRecently(expiry: Date, now: Date): boolean {
  const elapsed = now.getTime() - expiry.getTime();
  return elapsed >= 0 && elapsed <= ENDED_WINDOW_DAYS * DAY_MS;
}

/** Pengingat untuk langganan desa (trial atau berbayar). Null bila tidak ada yang perlu dikirim. */
export function pickSubscriptionReminder(opts: {
  status: string | null | undefined;
  expiry: Date | null | undefined;
  now: Date;
}): ReminderPlan | null {
  const status = String(opts.status ?? "").toLowerCase();
  const { expiry, now } = opts;

  if (status === "grace") {
    // Trial sudah lewat, desa dalam masa baca-saja. Satu kali per desa (trial hanya terjadi sekali).
    return { audience: "trial", stage: "ended", daysRemaining: null, expiry: expiry ?? now, sourceKey: "trial-ended" };
  }
  if (!expiry) return null;

  if (status === "trial") {
    if (expiry.getTime() > now.getTime()) {
      const days = daysUntil(expiry, now);
      const b = pickBucket(days, TRIAL_REMINDER_DAYS);
      return b == null ? null : { audience: "trial", stage: "upcoming", daysRemaining: days, expiry, sourceKey: `trial-d${b}` };
    }
    return endedRecently(expiry, now)
      ? { audience: "trial", stage: "ended", daysRemaining: null, expiry, sourceKey: "trial-ended" }
      : null;
  }

  if (status === "active" || status === "inactive") {
    if (status === "active" && expiry.getTime() > now.getTime()) {
      const days = daysUntil(expiry, now);
      const b = pickBucket(days, PAID_REMINDER_DAYS);
      return b == null
        ? null
        : { audience: "paid", stage: "upcoming", daysRemaining: days, expiry, sourceKey: `paid-d${b}-${isoDate(expiry)}` };
    }
    return endedRecently(expiry, now)
      ? { audience: "paid", stage: "ended", daysRemaining: null, expiry, sourceKey: `paid-ended-${isoDate(expiry)}` }
      : null;
  }
  return null;
}

/** Pengingat untuk add-on kapasitas arsip berlangganan. */
export function pickArsipReminder(opts: { expiry: Date; now: Date }): ReminderPlan | null {
  const { expiry, now } = opts;
  if (expiry.getTime() > now.getTime()) {
    const days = daysUntil(expiry, now);
    const b = pickBucket(days, ARSIP_REMINDER_DAYS);
    return b == null
      ? null
      : { audience: "arsip", stage: "upcoming", daysRemaining: days, expiry, sourceKey: `arsip-d${b}-${isoDate(expiry)}` };
  }
  return endedRecently(expiry, now)
    ? { audience: "arsip", stage: "ended", daysRemaining: null, expiry, sourceKey: `arsip-ended-${isoDate(expiry)}` }
    : null;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDateId(d: Date): string {
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
}

function whenText(plan: ReminderPlan): string {
  if (plan.stage === "ended") return "sudah berakhir";
  return plan.daysRemaining === 1 ? "berakhir besok" : `berakhir dalam ${plan.daysRemaining} hari`;
}

export type ReminderContent = { title: string; body: string; subject: string; html: string; text: string };

/** Isi pengingat: judul/isi singkat untuk lonceng aplikasi, serta subjek + HTML + teks untuk email. */
export function buildReminderContent(opts: {
  plan: ReminderPlan;
  villageName: string;
  subscriptionPlan: string | null | undefined;
  billingUrl: string;
  /** Hanya untuk audience "arsip". */
  arsipGb?: number;
  arsipBaseGb?: number;
}): ReminderContent {
  const { plan, villageName, billingUrl } = opts;
  const date = formatDateId(plan.expiry);
  const lengkap = isLengkapPlan(opts.subscriptionPlan);
  const lg = BILLING_CATALOG.desa_package.tiers.lengkap;

  let title: string;
  let lines: string[];

  if (plan.audience === "trial") {
    if (plan.stage === "upcoming") {
      title = `Trial Klandesa ${whenText(plan)}`;
      lines = [
        `Masa trial desa ${villageName} ${whenText(plan)} (${date}).`,
        `Untuk melanjutkan, aktifkan Paket Lengkap: ${formatIdr(lg.setupFee)} di awal, sudah termasuk 12 bulan pertama dan semua fitur.`,
      ];
    } else {
      title = "Trial Klandesa sudah berakhir";
      lines = [
        `Masa trial desa ${villageName} sudah berakhir. Akun saat ini dalam mode baca saja untuk sementara.`,
        `Aktifkan Paket Lengkap (${formatIdr(lg.setupFee)}, termasuk 12 bulan pertama) agar desa bisa kembali memakai semua fitur.`,
      ];
    }
  } else if (plan.audience === "paid") {
    const renew = lengkap
      ? `Perpanjang mulai ${formatIdr(lg.monthlyFee)} per bulan (pilih 1, 3, 6, atau 12 bulan). Sisa masa berlaku tidak hangus.`
      : "Perpanjang lewat halaman Tagihan agar layanan tetap berjalan.";
    if (plan.stage === "upcoming") {
      title = `Langganan Klandesa ${whenText(plan)}`;
      lines = [`Langganan desa ${villageName} ${whenText(plan)} (${date}).`, renew];
    } else {
      title = "Langganan Klandesa sudah berakhir";
      lines = [`Langganan desa ${villageName} berakhir pada ${date}. Akses fitur dinonaktifkan sampai langganan diperpanjang.`, renew];
    }
  } else {
    const gb = opts.arsipGb ?? 0;
    const base = opts.arsipBaseGb ?? 0;
    const keep = `Kuota kembali ke ${base} GB. File Anda tidak dihapus; unggahan baru hanya terblokir bila pemakaian melebihi kuota.`;
    if (plan.stage === "upcoming") {
      title = `Add-on penyimpanan ${gb} GB ${whenText(plan)}`;
      lines = [`Add-on penyimpanan arsip ${gb} GB desa ${villageName} ${whenText(plan)} (${date}).`, keep, "Perpanjang 1 bulan dari halaman Tagihan."];
    } else {
      title = `Add-on penyimpanan ${gb} GB sudah berakhir`;
      lines = [`Add-on penyimpanan arsip ${gb} GB desa ${villageName} berakhir pada ${date}.`, keep, "Berlangganan lagi dari halaman Tagihan bila perlu."];
    }
  }

  const body = lines.join(" ");
  const subject = `${title} (${villageName})`;
  const text = `${lines.join("\n\n")}\n\nBuka halaman Tagihan: ${billingUrl}\n\n— Tim Klandesa`;
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f2937">` +
    `<h2 style="font-size:18px;margin:0 0 12px">${escapeHtml(title)}</h2>` +
    lines.map((l) => `<p style="margin:0 0 12px">${escapeHtml(l)}</p>`).join("") +
    `<p style="margin:16px 0"><a href="${escapeHtml(billingUrl)}" style="background:#0d9488;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Buka halaman Tagihan</a></p>` +
    `<p style="margin:0;color:#6b7280;font-size:13px">Tim Klandesa</p></div>`;
  return { title, body, subject, html, text };
}
