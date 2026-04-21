import { getApiSession } from "@/lib/api-session";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

async function resolveVillage(
  req: NextRequest,
  queryVillageCode?: string,
  session?: any
) {
  if (session?.user?.villageCode) {
    const village = await prisma.village.findUnique({
      where: { code: session.user.villageCode },
    });
    if (village) return village;
  }

  if (queryVillageCode) {
    const village = await prisma.village.findUnique({
      where: { code: queryVillageCode },
    });
    if (village) return village;
  }

  const defaultCode = process.env.DEFAULT_VILLAGE_CODE;
  if (defaultCode) {
    const village = await prisma.village.findUnique({
      where: { code: defaultCode },
    });
    if (village) return village;
  }

  const firstVillage = await prisma.village.findFirst({
    orderBy: { id: "asc" },
  });
  return firstVillage;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(req.url);
    const villageCode = url.searchParams.get("villageCode") || undefined;
    const search = url.searchParams.get("search") || "";
    const category = url.searchParams.get("category") || "ALL";

    const village = await resolveVillage(req, villageCode, session);
    if (!village) {
      return NextResponse.json(
        { error: "Village not found" },
        { status: 404 }
      );
    }
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
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();

    const village = await resolveVillage(req, body.villageCode, session);
    if (!village) {
      return NextResponse.json(
        { error: "Village not found" },
        { status: 404 }
      );
    }
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
        createdById: session?.user?.id ? Number(session.user.id) : null,
      },
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/announcements error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
