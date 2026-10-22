import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";
import { describeMailRequest, excerpt } from "@/lib/mobile/mail-logic";
import { describeReport } from "@/lib/mobile/report-logic";

/** Satu permintaan untuk beranda (hemat kuota): urusan aktif, kabar desa, jumlah notifikasi belum dibaca. */
export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req);
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const now = new Date();
  const me = await getCitizenResident(ctx);

  const [announcements, unread, requests, reports, contact] = await Promise.all([
    prisma.announcement.findMany({
      where: { villageId: ctx.villageId, isActive: true, publishDate: { lte: now }, OR: [{ expiryDate: null }, { expiryDate: { gt: now } }] },
      orderBy: [{ isPinned: "desc" }, { publishDate: "desc" }],
      take: 5,
      select: { id: true, title: true, content: true, category: true, imageUrl: true, isPinned: true, publishDate: true },
    }),
    prisma.userNotification.count({ where: { accountType: ctx.accountType, accountId: ctx.accountId, readAt: null } }),
    me
      ? prisma.mailRequest.findMany({
          where: {
            villageId: ctx.villageId,
            residentId: me.id,
            OR: [{ status: "pending" }, { processedDate: { gte: new Date(now.getTime() - 14 * 24 * 3600 * 1000) } }],
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
    me
      ? prisma.citizenReport.findMany({
          where: {
            villageId: ctx.villageId,
            residentId: me.id,
            OR: [{ status: { in: ["PENDING", "PROCESS"] } }, { status: "DONE", resolvedFeedback: null }, { updatedAt: { gte: new Date(now.getTime() - 14 * 24 * 3600 * 1000) } }],
          },
          orderBy: { updatedAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
    prisma.village.findUnique({ where: { id: ctx.villageId }, select: { phone: true, address: true, email: true } }),
  ]);

  return NextResponse.json({
    village: { id: ctx.village.id, name: ctx.village.name, logoUrl: ctx.village.logoUrl, phone: contact?.phone ?? null, address: contact?.address ?? null, email: contact?.email ?? null },
    unreadNotifications: unread,
    activeRequests: [
      ...requests.map((r) => {
        const v = describeMailRequest(r, false);
        return { id: Number(r.id), kind: "mail" as const, type: r.mailType, forName: r.name, stage: v.stage, title: v.title, steps: v.steps.map((s) => s.state), updatedAt: r.processedDate ?? r.requestDate };
      }),
      ...reports.map((r) => {
        const v = describeReport(r.status, false);
        return { id: Number(r.id), kind: "report" as const, type: r.title, forName: "Laporan Anda", stage: v.stage, title: v.title, steps: v.steps.map((s) => s.state), updatedAt: r.updatedAt };
      }),
    ]
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
      .slice(0, 6),
    announcements: announcements.map((a) => ({
      id: a.id, title: a.title, excerpt: excerpt(a.content), category: a.category, imageUrl: a.imageUrl, pinned: a.isPinned, publishedAt: a.publishDate,
    })),
  });
}
