import { requireVillageApiContext } from "@/lib/api-village-context";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

const ALLOWED_CATEGORIES = new Set([
  "UMUM",
  "PEMBANGUNAN",
  "KESEHATAN",
  "PENDIDIKAN",
  "KEAMANAN",
  "EKONOMI",
]);

function mapRoleLabel(role?: string | null): string {
  const mapping: Record<string, string> = {
    admin: "Admin Desa",
    staff: "Staff Desa",
    village_head: "Kepala Desa",
    secretary: "Sekretaris Desa",
  };
  return role ? mapping[role] || role : "Warga";
}

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const rows = await prisma.forumThread.findMany({
      where: { villageId: village.id },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: {
        _count: {
          select: { replies: true },
        },
      },
    });

    const mapped = rows.map((row) => ({
      id: Number(row.id),
      title: row.title,
      content: row.content,
      category: row.category,
      status: row.status,
      is_pinned: row.isPinned,
      is_locked: row.isLocked,
      created_by: row.createdByName,
      created_by_role: row.createdByRole,
      created_at: row.createdAt.toISOString(),
      replies_count: row._count.replies,
      likes_count: row.likesCount,
      views_count: row.viewsCount,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("GET /api/forum-threads error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, session } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = await req.json();
    const title = String(body.title || "").trim();
    const content = String(body.content || "").trim();
    const category = String(body.category || "UMUM")
      .trim()
      .toUpperCase();

    if (!title || !content) {
      return NextResponse.json(
        { error: "Judul dan isi diskusi wajib diisi" },
        { status: 400 },
      );
    }

    if (!ALLOWED_CATEGORIES.has(category)) {
      return NextResponse.json(
        { error: "Kategori tidak valid" },
        { status: 400 },
      );
    }

    const userId = Number(session.user.id);
    const user = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, role: true },
        })
      : null;

    const created = await prisma.forumThread.create({
      data: {
        villageId: village.id,
        title,
        content,
        category,
        status: "OPEN",
        isPinned: false,
        isLocked: false,
        createdBy: userId,
        createdByName: user?.name || session?.user?.name || "Warga",
        createdByRole: mapRoleLabel(user?.role),
      },
    });

    return NextResponse.json(
      {
        id: Number(created.id),
        title: created.title,
        content: created.content,
        category: created.category,
        status: created.status,
        is_pinned: created.isPinned,
        is_locked: created.isLocked,
        created_by: created.createdByName,
        created_by_role: created.createdByRole,
        created_at: created.createdAt.toISOString(),
        replies_count: 0,
        likes_count: created.likesCount,
        views_count: created.viewsCount,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("POST /api/forum-threads error:", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
