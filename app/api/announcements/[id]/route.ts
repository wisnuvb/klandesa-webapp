/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await req.json();

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Optional: check if the announcement belongs to the same village as the user
    // For now, keep it simple

    const announcement = await prisma.announcement.update({
      where: { id },
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
    const _session = await getServerSession(authOptions);
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Perform soft delete or hard delete. The prompt said "hapus", so let's do hard delete.
    // Or just set isActive = false. Let's do hard delete as it's common for announcements.
    await prisma.announcement.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/announcements/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
