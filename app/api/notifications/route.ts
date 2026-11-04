import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatTimeAgo } from "@/lib/formatTimeAgo";
import { syncAdminNotificationsForVillage } from "@/lib/notifications/syncAdminNotifications";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { NOTIFICATION_RETENTION, notificationCutoffs } from "@/lib/notifications/retention-policy";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, userId } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    await syncAdminNotificationsForVillage(village.id);

    // Mode ringkas untuk lencana lonceng saat halaman dimuat: cukup jumlah belum dibaca (1 COUNT, ±50 byte),
    // daftar penuh baru diminta saat lonceng dibuka. Dibatasi seperti daftar (LIST_LIMIT) agar angkanya konsisten.
    if (new URL(req.url).searchParams.get("summary") === "1") {
      const unread = await prisma.adminNotification.count({
        where: {
          villageId: village.id,
          createdAt: { gte: notificationCutoffs().visibleSince },
          reads: { none: { userId } },
        },
      });
      return NextResponse.json({ unreadCount: Math.min(unread, NOTIFICATION_RETENTION.LIST_LIMIT) });
    }

    const rows = await prisma.adminNotification.findMany({
      where: { villageId: village.id, createdAt: { gte: notificationCutoffs().visibleSince } },
      orderBy: { createdAt: "desc" },
      take: NOTIFICATION_RETENTION.LIST_LIMIT,
      include: {
        reads: {
          where: { userId },
        },
      },
    });

    const notifications = rows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      href: n.href ?? "/dashboard",
      timeAgo: formatTimeAgo(n.createdAt),
      read: n.reads.length > 0,
    }));

    const unreadCount = notifications.filter((n) => !n.read).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    console.error("GET /api/notifications error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
