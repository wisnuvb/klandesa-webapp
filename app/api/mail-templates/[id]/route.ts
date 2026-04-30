import { requireVillageApiContext } from "@/lib/api-village-context";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

/**
 * Hapus template milik desa. Surat (`MailService`) yang masih memakai template ini
 * ikut dihapus (riwayat & lampiran mengikuti cascade ke `mail_services`).
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

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
