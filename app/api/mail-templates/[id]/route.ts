import { requireVillageApiContext } from "@/lib/api-village-context";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

/**
 * Hapus template milik desa. Surat (`MailService`) adalah arsip resmi, jadi tidak pernah
 * ikut terhapus: bila template masih dipakai surat, template hanya diarsipkan
 * (`isActive=false`, tidak muncul lagi di daftar), dan baru dihapus permanen bila belum
 * pernah dipakai.
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

    const letterCount = await prisma.mailService.count({
      where: { templateId: id },
    });
    if (letterCount > 0) {
      await prisma.mailTemplate.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ ok: true, archived: true, keptLetters: letterCount });
    }

    try {
      await prisma.mailTemplate.delete({ where: { id } });
    } catch (err) {
      // Surat baru saja dibuat dengan template ini (balapan) → arsipkan saja.
      if ((err as { code?: string })?.code === "P2003") {
        await prisma.mailTemplate.update({ where: { id }, data: { isActive: false } });
        return NextResponse.json({ ok: true, archived: true, keptLetters: 1 });
      }
      throw err;
    }

    return NextResponse.json({ ok: true, archived: false, keptLetters: 0 });
  } catch (err) {
    console.error("DELETE /api/mail-templates/[id] error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
