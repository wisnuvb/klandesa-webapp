import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import { formatTimeAgo } from "@/lib/formatTimeAgo";
import { syncAdminNotificationsForVillage } from "@/lib/notifications/syncAdminNotifications";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id, 10);
    if (Number.isNaN(userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Desa tidak ditemukan" }, { status: 404 });
    }

    await syncAdminNotificationsForVillage(village.id);

    const rows = await prisma.adminNotification.findMany({
      where: { villageId: village.id },
      orderBy: { createdAt: "desc" },
      take: 30,
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
