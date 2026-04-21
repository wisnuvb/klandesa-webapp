import { getApiSession } from "@/lib/api-session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

export async function POST(req: NextRequest) {
  try {
    const session = await getApiSession(req);
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
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = await req.json().catch(() => ({}));

    if (body.all === true) {
      const notifs = await prisma.adminNotification.findMany({
        where: { villageId: village.id },
        select: { id: true },
      });

      if (notifs.length > 0) {
        await prisma.notificationRead.createMany({
          data: notifs.map((n) => ({
            notificationId: n.id,
            userId,
          })),
          skipDuplicates: true,
        });
      }

      return NextResponse.json({ ok: true });
    }

    const notificationId = Number(body.notificationId);
    if (!Number.isFinite(notificationId) || notificationId < 1) {
      return NextResponse.json(
        { error: "notificationId tidak valid" },
        { status: 400 },
      );
    }

    const n = await prisma.adminNotification.findFirst({
      where: { id: notificationId, villageId: village.id },
    });

    if (!n) {
      return NextResponse.json({ error: "Notifikasi tidak ditemukan" }, { status: 404 });
    }

    await prisma.notificationRead.upsert({
      where: {
        notificationId_userId: {
          notificationId,
          userId,
        },
      },
      create: { notificationId, userId },
      update: {},
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/notifications/read error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
