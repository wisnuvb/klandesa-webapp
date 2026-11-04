import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { pickSummary } from "@/lib/audit/diff";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { emitWebhookEvent } from "@/lib/webhooks/deliver";
import { parseAnnouncementImageUrl } from "@/lib/announcements/image-url";
import { LIST_SAFETY_TAKE, capRows } from "@/lib/http/list-cap";

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

    // Batas pengaman longgar (urut terbaru, disematkan dulu); pencarian & kategori di atas tetap menjangkau semua data.
    const fetched = await prisma.announcement.findMany({
      where,
      orderBy: [
        { isPinned: "desc" },
        { publishDate: "desc" },
        { id: "desc" },
      ],
      take: LIST_SAFETY_TAKE,
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
      },
    });
    const { rows: announcements, truncated } = capRows(fetched);

    if (!truncated) {
      return NextResponse.json({ rows: announcements, total: announcements.length, truncated: false });
    }

    // Terpotong: kartu ringkasan di UI tetap harus mencerminkan seluruh hasil, bukan hanya baris yang tampil.
    const [total, pinnedTotal, views] = await Promise.all([
      prisma.announcement.count({ where }),
      prisma.announcement.count({ where: { ...where, isPinned: true } }),
      prisma.announcement.aggregate({ where, _sum: { viewCount: true } }),
    ]);
    return NextResponse.json({
      rows: announcements,
      total,
      truncated: true,
      pinnedTotal,
      viewsTotal: views._sum.viewCount ?? 0,
    });
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

    const image = parseAnnouncementImageUrl(body.imageUrl);
    if (!image.ok) return NextResponse.json({ error: image.error }, { status: 400 });

    const announcement = await prisma.announcement.create({
      data: {
        villageId: village.id,
        title: body.title,
        content: body.content,
        category: body.category,
        imageUrl: image.value ?? null,
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
