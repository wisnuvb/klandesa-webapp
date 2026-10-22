import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { audit, requireStaff } from "@/lib/mobile/staff";
import { broadcastPushToVillageCitizens } from "@/lib/mobile/push";
import { excerpt } from "@/lib/mobile/mail-logic";
import {
  ANNOUNCEMENT_CATEGORIES, MAX_ANNOUNCEMENTS_PER_USER_PER_DAY, MAX_BROADCAST_PUSH_PER_DAY, isAnnouncementCategory,
} from "@/lib/mobile/resident-logic";

export async function GET(req: NextRequest) {
  const g = await requireStaff(req, "announcements", "read");
  if (!g.ok) return g.response;
  const rows = await prisma.announcement.findMany({
    where: { villageId: g.ctx.villageId },
    orderBy: [{ publishDate: "desc" }],
    take: 30,
    select: { id: true, title: true, content: true, category: true, isPinned: true, isActive: true, publishDate: true, viewCount: true },
  });
  return NextResponse.json({
    categories: ANNOUNCEMENT_CATEGORIES,
    items: rows.map((a) => ({ id: a.id, title: a.title, excerpt: excerpt(a.content, 120), category: a.category, pinned: a.isPinned, active: a.isActive, publishedAt: a.publishDate, views: a.viewCount })),
  });
}

/**
 * Terbitkan pengumuman dan (opsional) kirim notifikasi ke seluruh warga desa.
 * Push dibatasi 3 siaran per 24 jam per desa agar tidak menjadi spam; pengumuman tetap terbit tanpa push.
 */
export async function POST(req: NextRequest) {
  const g = await requireStaff(req, "announcements", "create");
  if (!g.ok) return g.response;
  const { ctx } = g;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const category = body?.category;
  if (title.length < 3 || title.length > 200 || content.length < 3 || content.length > 5000 || !isAnnouncementCategory(category)) {
    return mobileError("INVALID_REQUEST", "Isi judul (3–200 huruf), isi pengumuman, dan pilih jenisnya.", 400);
  }

  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const mine = await prisma.announcement.count({ where: { villageId: ctx.villageId, createdById: ctx.userId, createdAt: { gte: since } } });
  if (mine >= MAX_ANNOUNCEMENTS_PER_USER_PER_DAY) {
    return mobileError("RATE_LIMITED", "Batas pengumuman hari ini tercapai. Coba lagi besok.", 429);
  }

  const created = await prisma.announcement.create({
    data: { villageId: ctx.villageId, title, content, category, isPinned: body?.pinned === true, createdById: ctx.userId },
  });

  let pushed = 0;
  let pushNote: string | null = null;
  if (body?.notify === true) {
    const recent = await prisma.auditLog.count({ where: { villageId: ctx.villageId, action: "broadcast_push", createdAt: { gte: since } } });
    if (recent >= MAX_BROADCAST_PUSH_PER_DAY) {
      pushNote = `Pengumuman terbit, tetapi notifikasi tidak dikirim: batas ${MAX_BROADCAST_PUSH_PER_DAY} siaran per hari sudah tercapai.`;
    } else {
      // Kotak masuk untuk semua warga aktif + push; dijalankan di latar belakang agar respons cepat.
      void (async () => {
        const accounts = await prisma.citizenAccount.findMany({ where: { villageId: ctx.villageId, status: "ACTIVE" }, select: { id: true }, take: 20_000 });
        if (accounts.length) {
          await prisma.userNotification.createMany({
            data: accounts.map((a) => ({ accountType: "citizen", accountId: a.id, villageId: ctx.villageId, type: "announcement", title: title.slice(0, 160), body: excerpt(content, 140), deepLink: `/kabar/${created.id}` })),
          });
        }
        await broadcastPushToVillageCitizens(ctx.villageId, { title: title.slice(0, 160), body: excerpt(content, 140), deepLink: `/kabar/${created.id}` });
      })();
      void audit(ctx, req, "broadcast_push", "announcements", created.id, { title });
      pushed = 1;
    }
  }
  void audit(ctx, req, "create", "announcements", created.id, { title, pinned: created.isPinned });

  return NextResponse.json({ id: created.id, notified: pushed === 1, note: pushNote }, { status: 201 });
}
