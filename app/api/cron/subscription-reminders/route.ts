import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCronSecret } from "@/lib/regional-news/config";
import { getMainSiteOrigin } from "@/lib/seo/url";
import { isBrevoConfigured, sendBrevoEmail } from "@/lib/email/brevo";
import {
  buildReminderContent,
  ENDED_WINDOW_DAYS,
  pickArsipReminder,
  pickSubscriptionReminder,
  type ReminderPlan,
} from "@/lib/billing/reminders";
import { ARSIP_ADDON_MODULE_CODE, arsipBaseGbForPlan, arsipGbForPlanCode } from "@/lib/digitalArchive/storage-limit";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CANDIDATES = 5000;
const MAX_RECIPIENTS_PER_VILLAGE = 5;
const NOTIFICATION_TYPE = "subscription_reminder";

type VillageLite = { id: number; name: string; email: string | null; subscriptionPlan: string };

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/** Admin/kepala desa yang aktif + email desa; unik dan dibatasi agar satu desa tidak memicu banyak email. */
async function recipientsFor(village: VillageLite): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { villageId: village.id, isActive: true, role: { in: ["admin", "village_head"] } },
    select: { email: true },
    take: 10,
  });
  const set = new Set<string>();
  for (const e of [...users.map((u) => u.email), village.email]) {
    const v = (e ?? "").trim().toLowerCase();
    if (v && isValidEmail(v)) set.add(v);
  }
  return [...set].slice(0, MAX_RECIPIENTS_PER_VILLAGE);
}

/**
 * Job harian: kirim email pengingat masa berlaku (trial, langganan, add-on arsip) lewat Brevo, sekaligus membuat notifikasi
 * dalam aplikasi. Idempoten: satu AdminNotification per (desa, sourceKey) menandai pengingat yang sudah dikirim.
 * Dijalankan dengan `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(req: NextRequest) {
  const secret = getCronSecret();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET belum dikonfigurasi" }, { status: 503 });
  if (req.headers.get("authorization")?.trim() !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isBrevoConfigured()) {
    return NextResponse.json({ error: "Brevo belum dikonfigurasi (BREVO_API_KEY, BREVO_SENDER_EMAIL)" }, { status: 503 });
  }

  const now = new Date();
  const billingUrl = `${getMainSiteOrigin()}/billing`;
  const lookback = new Date(now.getTime() - (ENDED_WINDOW_DAYS + 1) * DAY_MS);

  const [villages, arsipSubs] = await Promise.all([
    prisma.village.findMany({
      where: {
        // Desa paket lama (Starter/Profesional/Enterprise) dibiarkan: mereka sudah membayar di muka dan tidak ditagih bulanan.
        subscriptionPlan: "lengkap",
        OR: [
          { subscriptionStatus: "grace" },
          {
            subscriptionStatus: { in: ["trial", "active", "inactive"] },
            subscriptionExpiry: { gte: lookback, lte: new Date(now.getTime() + 31 * DAY_MS) },
          },
        ],
      },
      select: { id: true, name: true, email: true, subscriptionPlan: true, subscriptionStatus: true, subscriptionExpiry: true },
      take: MAX_CANDIDATES,
    }),
    prisma.villageModuleSubscription.findMany({
      where: { moduleCode: ARSIP_ADDON_MODULE_CODE, expiryDate: { gte: lookback, lte: new Date(now.getTime() + 8 * DAY_MS) } },
      select: { planCode: true, expiryDate: true, village: { select: { id: true, name: true, email: true, subscriptionPlan: true } } },
      take: MAX_CANDIDATES,
    }),
  ]);

  type Job = { village: VillageLite; plan: ReminderPlan; arsipGb?: number };
  const jobs: Job[] = [];
  for (const v of villages) {
    const plan = pickSubscriptionReminder({ status: v.subscriptionStatus, expiry: v.subscriptionExpiry, now });
    if (plan) jobs.push({ village: v, plan });
  }
  for (const s of arsipSubs) {
    const plan = pickArsipReminder({ expiry: s.expiryDate, now });
    if (plan) jobs.push({ village: s.village, plan, arsipGb: arsipGbForPlanCode(s.planCode) });
  }

  const stats = { candidates: jobs.length, sent: 0, skippedAlreadySent: 0, noRecipient: 0, failed: 0 };
  const recipientCache = new Map<number, string[]>();

  for (const job of jobs) {
    const content = buildReminderContent({
      plan: job.plan,
      villageName: job.village.name,
      subscriptionPlan: job.village.subscriptionPlan,
      billingUrl,
      arsipGb: job.arsipGb,
      arsipBaseGb: arsipBaseGbForPlan(job.village.subscriptionPlan),
    });

    // Klaim lebih dulu: bila sudah ada (unik per desa+sourceKey) pengingat ini pernah diproses.
    let claimId: number;
    try {
      const created = await prisma.adminNotification.create({
        data: {
          villageId: job.village.id,
          type: NOTIFICATION_TYPE,
          sourceKey: job.plan.sourceKey,
          title: content.title,
          body: content.body,
          href: "/billing",
        },
        select: { id: true },
      });
      claimId = created.id;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        stats.skippedAlreadySent += 1;
        continue;
      }
      throw e;
    }

    let recipients = recipientCache.get(job.village.id);
    if (!recipients) {
      recipients = await recipientsFor(job.village);
      recipientCache.set(job.village.id, recipients);
    }
    if (recipients.length === 0) {
      stats.noRecipient += 1; // notifikasi dalam aplikasi tetap ada
      continue;
    }

    let delivered = 0;
    for (const to of recipients) {
      const res = await sendBrevoEmail({ to, subject: content.subject, html: content.html, text: content.text });
      if (res.ok) delivered += 1;
      else console.error(`[subscription-reminders] gagal kirim (desa ${job.village.id}): ${res.error}`);
    }
    if (delivered > 0) {
      stats.sent += 1;
    } else {
      // Tidak ada email yang terkirim: lepas klaim supaya dicoba lagi pada proses berikutnya.
      await prisma.adminNotification.delete({ where: { id: claimId } }).catch(() => undefined);
      stats.failed += 1;
    }
  }

  return NextResponse.json({ ok: true, ...stats });
}
