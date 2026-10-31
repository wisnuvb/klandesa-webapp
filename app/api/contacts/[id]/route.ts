import { requirePlatformSession } from "@/app/api/admin/_auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Pesan formulir kontak landing milik platform (lintas desa): hanya admin platform, bukan admin desa mana pun.
    const auth = await requirePlatformSession(req);
    if (!auth.ok) return auth.response;

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

    const respondedAt = body.isResponded ? new Date() : null;
    // `respondedByUserId` berelasi ke users (pengguna desa); id admin platform berasal dari tabel lain, jadi dikosongkan.
    const respondedByUserId = null;

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

