import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: idStr } = await params;
    const id = BigInt(idStr);

    const body = (await req.json().catch(() => null)) as
      | { isResponded?: boolean }
      | null;

    if (typeof body?.isResponded !== "boolean") {
      return NextResponse.json(
        { error: "isResponded wajib boolean" },
        { status: 400 }
      );
    }

    const userId = Number(session.user.id);
    const respondedAt = body.isResponded ? new Date() : null;
    const respondedByUserId = body.isResponded && Number.isFinite(userId) ? userId : null;

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        isResponded: body.isResponded,
        respondedAt,
        respondedByUserId,
      },
      select: {
        id: true,
        isResponded: true,
        respondedAt: true,
        respondedByUserId: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      id: String(updated.id),
      isResponded: updated.isResponded,
      respondedAt: updated.respondedAt?.toISOString() ?? null,
      respondedByUserId: updated.respondedByUserId,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

