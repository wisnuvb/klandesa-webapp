import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { diffRecord } from "@/lib/audit/diff";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await req.json();

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const existing = await prisma.announcement.findFirst({
      where: { id, villageId: village.id },
      select: { id: true, title: true, content: true, category: true, isPinned: true, publishDate: true, isActive: true, viewCount: true },
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

    // Isi pengumuman hanya ditandai "berubah", nilainya tidak dicatat.
    await auditWeb(req, loaded.ctx, "update", "announcements", id, {
      title: announcement.title,
      ...diffRecord(existing, announcement, { maskedFields: new Set(["content"]) }),
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
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const { id: idStr } = await params;
    const id = parseInt(idStr);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const existing = await prisma.announcement.findFirst({
      where: { id, villageId: village.id },
      select: { id: true, title: true, category: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
    }

    await prisma.announcement.delete({ where: { id: existing.id } });

    await auditWeb(req, loaded.ctx, "delete", "announcements", id, { title: existing.title, category: existing.category });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/announcements/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
