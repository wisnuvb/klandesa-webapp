import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCronSecret } from "@/lib/regional-news/config";
import { isValidCronAuth } from "@/lib/regional-news/cron-auth";
import { isBrevoConfigured, sendBrevoEmail } from "@/lib/email/brevo";
import { notifyVillageStaff } from "@/lib/mobile/notify";
import { runReminders } from "@/lib/kepatuhan/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Job harian: pengingat tenggat laporan wajib desa (Kalender Kepatuhan) lewat notifikasi web, notifikasi mobile staf desa,
 * dan email (bila Brevo dikonfigurasi). Idempoten: satu AdminNotification unik per (desa, butir, tahun, tahap) diklaim
 * sebelum mengirim apa pun, jadi menjalankan ulang tidak mengirim ganda.
 * Dijalankan dengan `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(req: NextRequest) {
  const secret = getCronSecret();
  if (!secret) return NextResponse.json({ error: "CRON_SECRET belum dikonfigurasi" }, { status: 503 });
  if (!isValidCronAuth(req.headers.get("authorization"), secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const email = isBrevoConfigured();
  const stats = await runReminders(prisma, {
    deps: {
      sendEmail: email ? async (m) => sendBrevoEmail(m).then((r) => ({ ok: r.ok })) : undefined,
      notifyStaff: (villageId, n) => notifyVillageStaff(villageId, "apbdes", { type: "system", title: n.title, body: n.body }),
    },
  });
  return NextResponse.json({ ok: true, emailConfigured: email, ...stats });
}
