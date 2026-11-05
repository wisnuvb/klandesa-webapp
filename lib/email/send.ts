import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isBrevoConfigured, sendBrevoEmail } from "./brevo";
import type { EmailContent } from "./render";

/**
 * Pengirim email transaksional dengan HEMAT KUOTA:
 *  - anggaran harian (`EMAIL_DAILY_LIMIT`, bawaan 250 dari 300/hari paket gratis Brevo): email biasa DITUNDA/dilewati bila habis,
 *    email kritis (undangan, atur ulang sandi) masih boleh sampai `+CRITICAL_HEADROOM`;
 *  - dedup: template + penerima yang sama dalam jendela `dedupeMs` tidak dikirim lagi (tombol ditekan berulang/serangan);
 *  - tiap pengiriman dicatat di `email_logs` (alamat hanya sebagai hash) sehingga anggaran terhitung lintas worker PM2.
 * Tidak pernah melempar: kegagalan dikembalikan sebagai hasil.
 */
export type EmailTemplateId = "invite" | "reset" | "password-changed" | "welcome" | "owner-notify";
const CRITICAL: ReadonlySet<EmailTemplateId> = new Set(["invite", "reset"]);
const CRITICAL_HEADROOM = 40;
const DAY_MS = 24 * 60 * 60 * 1000;

export type SendResult =
  | { ok: true }
  | { ok: false; reason: "not-configured" | "duplicate" | "quota" | "failed"; error?: string };

export const hashRecipient = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

export function dailyLimit(): number {
  const n = Number(process.env.EMAIL_DAILY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 250;
}

/** Murni: apakah anggaran mengizinkan? (dipisah agar bisa dites) */
export function budgetAllows(sentLast24h: number, template: EmailTemplateId, limit = dailyLimit(), source: "admin" | "public" = "public"): boolean {
  if (!CRITICAL.has(template)) return sentLast24h < limit;
  // Cadangan kritis dibagi: tindakan admin (bisa diulang-ulang oleh desa mana pun) hanya boleh memakai separuhnya, sisanya
  // dicadangkan untuk "lupa kata sandi" publik agar satu desa tidak bisa menghabiskan jalur pemulihan seluruh platform.
  return sentLast24h < limit + (source === "admin" ? CRITICAL_HEADROOM / 2 : CRITICAL_HEADROOM);
}

async function log(template: string, toHash: string, status: "SENT" | "FAILED" | "SKIPPED", error?: string) {
  try {
    await prisma.emailLog.create({ data: { template, toHash, status, error: error?.slice(0, 255) ?? null } });
  } catch (e) {
    console.error("[email] gagal mencatat log:", e);
  }
}

export async function sendTransactional(opts: {
  template: EmailTemplateId;
  to: string;
  content: EmailContent;
  /** Lewati bila template+penerima yang sama sudah TERKIRIM dalam jendela ini. */
  dedupeMs?: number;
  /** "admin" = dipicu admin desa (cadangan kritis terbatas); bawaan "public". */
  source?: "admin" | "public";
  now?: Date;
}): Promise<SendResult> {
  const to = opts.to.trim().toLowerCase();
  const toHash = hashRecipient(to);
  const now = opts.now ?? new Date();

  if (!isBrevoConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      // Pengembangan lokal: tampilkan isi (termasuk tautan) di terminal agar alur bisa dicoba tanpa kunci Brevo.
      console.log(`\n[email:dev] ${opts.template} -> ${to}\nSubjek: ${opts.content.subject}\n${opts.content.text}\n`);
    }
    return { ok: false, reason: "not-configured" };
  }

  try {
    if (opts.dedupeMs) {
      const dup = await prisma.emailLog.findFirst({
        where: { template: opts.template, toHash, status: "SENT", createdAt: { gt: new Date(now.getTime() - opts.dedupeMs) } },
        select: { id: true },
      });
      if (dup) return { ok: false, reason: "duplicate" };
    }
    const sent24h = await prisma.emailLog.count({ where: { status: "SENT", createdAt: { gt: new Date(now.getTime() - DAY_MS) } } });
    if (!budgetAllows(sent24h, opts.template, dailyLimit(), opts.source ?? "public")) {
      await log(opts.template, toHash, "SKIPPED", "kuota harian habis");
      return { ok: false, reason: "quota" };
    }
  } catch (e) {
    // DB tidak bisa dibaca: jangan menahan email kritis, tetapi jangan mengirim yang tidak kritis tanpa anggaran.
    console.error("[email] pemeriksaan anggaran gagal:", e);
    if (!CRITICAL.has(opts.template)) return { ok: false, reason: "failed", error: "anggaran tak terbaca" };
  }

  // `template` agar sendBrevoEmail tidak mencatat ganda: pencatatan dilakukan di sini.
  const res = await sendBrevoEmail({ to, subject: opts.content.subject, html: opts.content.html, text: opts.content.text, skipLog: true });
  await log(opts.template, toHash, res.ok ? "SENT" : "FAILED", res.ok ? undefined : res.error);
  return res.ok ? { ok: true } : { ok: false, reason: "failed", error: res.error };
}
