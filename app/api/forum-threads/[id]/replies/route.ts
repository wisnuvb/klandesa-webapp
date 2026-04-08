/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";

function mapRoleLabel(role?: string | null): string {
  const mapping: Record<string, string> = {
    admin: "Admin Desa",
    staff: "Staff Desa",
    village_head: "Kepala Desa",
    secretary: "Sekretaris Desa",
  };
  return role ? (mapping[role] || role) : "Warga";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: idStr } = await params;
    const threadId = BigInt(idStr);

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }

    const thread = await prisma.forumThread.findFirst({
      where: { id: threadId, villageId: village.id },
      select: { id: true },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread tidak ditemukan" }, { status: 404 });
    }

    const rows = await prisma.forumReply.findMany({
      where: { villageId: village.id, threadId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(
      rows.map((row) => ({
        id: Number(row.id),
        thread_id: Number(row.threadId),
        content: row.content,
        created_by: row.createdByName,
        created_by_role: row.createdByRole,
        created_at: row.createdAt.toISOString(),
        likes_count: row.likesCount,
      })),
    );
  } catch (error) {
    console.error("GET /api/forum-threads/[id]/replies error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const { id: idStr } = await params;
    const threadId = BigInt(idStr);

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }

    const body = await req.json();
    const content = String(body.content || "").trim();

    if (!content) {
      return NextResponse.json({ error: "Balasan tidak boleh kosong" }, { status: 400 });
    }

    const thread = await prisma.forumThread.findFirst({
      where: { id: threadId, villageId: village.id },
      select: { isLocked: true, status: true },
    });

    if (!thread) {
      return NextResponse.json({ error: "Thread tidak ditemukan" }, { status: 404 });
    }

    if (thread.isLocked || thread.status === "CLOSED") {
      return NextResponse.json({ error: "Thread sudah ditutup" }, { status: 400 });
    }

    const userId = session?.user?.id ? Number(session.user.id) : null;
    const user = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, role: true },
        })
      : null;

    const created = await prisma.forumReply.create({
      data: {
        threadId,
        villageId: village.id,
        content,
        createdBy: userId,
        createdByName: user?.name || session?.user?.name || "Warga",
        createdByRole: mapRoleLabel(user?.role),
      },
    });

    return NextResponse.json(
      {
        id: Number(created.id),
        thread_id: Number(created.threadId),
        content: created.content,
        created_by: created.createdByName,
        created_by_role: created.createdByRole,
        created_at: created.createdAt.toISOString(),
        likes_count: created.likesCount,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("POST /api/forum-threads/[id]/replies error:", error);
    return NextResponse.json(
      { error: error?.message || "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
