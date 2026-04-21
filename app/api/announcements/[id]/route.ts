import { getApiSession } from "@/lib/api-session";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await req.json();

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const existing = await prisma.announcement.findFirst({
      where: { id, villageId: village.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    const announcement = await prisma.announcement.update({
      where: { id: existing.id },
      data: {
        title: body.title,
        content: body.content,
        category: body.category,
        imageUrl: body.imageUrl,
        isPinned: body.isPinned,
        publishDate: body.publishDate ? new Date(body.publishDate) : undefined,
        isActive: body.isActive,
        viewCount: body.viewCount,
      },
    });

    return NextResponse.json(announcement);
  } catch (error: any) {
    console.error("PATCH /api/announcements/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(_req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const village = await resolveVillage({ req: _req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const existing = await prisma.announcement.findFirst({
      where: { id, villageId: village.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    await prisma.announcement.delete({ where: { id: existing.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/announcements/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
