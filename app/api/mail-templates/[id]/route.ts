import { getApiSession } from "@/lib/api-session";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSubdomain } from "@/lib/subdomain";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

async function resolveVillage(req: NextRequest, session?: any) {
  if (session?.user?.villageCode) {
    const village = await prisma.village.findUnique({
      where: { code: session.user.villageCode },
    });
    if (village) return village;
  }

  const sub = getSubdomain(req);
  if (sub && sub !== "app") {
    const village = await prisma.village.findUnique({ where: { code: sub } });
    if (village) return village;
  }

  return await prisma.village.findFirst({
    orderBy: { id: "asc" },
  });
}

/**
 * Hapus template milik desa. Surat (`MailService`) yang masih memakai template ini
 * ikut dihapus (riwayat & lampiran mengikuti cascade ke `mail_services`).
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const village = await resolveVillage(req, session);

    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { id: raw } = await context.params;
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const row = await prisma.mailTemplate.findUnique({
      where: { id },
      select: { id: true, villageId: true, isGlobal: true, name: true },
    });

    if (!row) {
      return NextResponse.json({ error: "Template tidak ditemukan" }, { status: 404 });
    }

    if (row.isGlobal || row.villageId == null || row.villageId !== village.id) {
      return NextResponse.json(
        { error: "Template katalog sistem atau milik desa lain tidak dapat dihapus." },
        { status: 403 },
      );
    }

    let deletedLetters = 0;
    await prisma.$transaction(async (tx) => {
      const del = await tx.mailService.deleteMany({
        where: { templateId: id, villageId: village.id },
      });
      deletedLetters = del.count;
      await tx.mailTemplate.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true, deletedLetters });
  } catch (err) {
    console.error("DELETE /api/mail-templates/[id] error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
