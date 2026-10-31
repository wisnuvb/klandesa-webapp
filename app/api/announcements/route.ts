import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { pickSummary } from "@/lib/audit/diff";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { emitWebhookEvent } from "@/lib/webhooks/deliver";

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const category = url.searchParams.get("category") || "ALL";

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const where: any = {
      villageId: village.id,
      isActive: true,
    };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    if (category !== "ALL") {
      where.category = category;
    }

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: [
        { isPinned: "desc" },
        { publishDate: "desc" },
      ],
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ rows: announcements });
  } catch (error: any) {
    console.error("GET /api/announcements error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, session } = loaded.ctx;

    const body = await req.json();

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const announcement = await prisma.announcement.create({
      data: {
        villageId: village.id,
        title: body.title,
        content: body.content,
        category: body.category,
        imageUrl: body.imageUrl || null,
        isPinned: body.isPinned || false,
        publishDate: body.publishDate ? new Date(body.publishDate) : new Date(),
        createdById: Number(session.user.id),
      },
    });

    // Hanya judul & metadata; isi pengumuman tidak dicatat.
    await auditWeb(req, loaded.ctx, "create", "announcements", announcement.id, pickSummary(announcement, ["title", "category", "isPinned"]));

    emitWebhookEvent(village.id, "pengumuman.terbit", { announcementId: announcement.id });

    return NextResponse.json(announcement, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/announcements error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
