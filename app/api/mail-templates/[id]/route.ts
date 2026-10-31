import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { villageTemplateScope } from "@/lib/mail/template-access";

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
      await auditWeb(req, loaded.ctx, "delete", "mail_templates", id, { name: row.name, archived: true, keptLetters: letterCount });
      return NextResponse.json({ ok: true, archived: true, keptLetters: letterCount });
    }

    try {
      await prisma.mailTemplate.delete({ where: { id } });
    } catch (err) {
      // Surat baru saja dibuat dengan template ini (balapan) → arsipkan saja.
      if ((err as { code?: string })?.code === "P2003") {
        await prisma.mailTemplate.update({ where: { id }, data: { isActive: false } });
        await auditWeb(req, loaded.ctx, "delete", "mail_templates", id, { name: row.name, archived: true, keptLetters: 1 });
        return NextResponse.json({ ok: true, archived: true, keptLetters: 1 });
      }
      throw err;
    }

    await auditWeb(req, loaded.ctx, "delete", "mail_templates", id, { name: row.name, archived: false });
    return NextResponse.json({ ok: true, archived: false, keptLetters: 0 });
  } catch (err) {
    console.error("DELETE /api/mail-templates/[id] error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

/** Satu template (milik desa atau katalog global) lengkap dengan dokumennya. */
export async function GET(
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
    const id = /^\d{1,9}$/.test(raw) ? Number(raw) : 0;
    if (id <= 0) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const row = await prisma.mailTemplate.findFirst({
      where: { id, isActive: true, ...villageTemplateScope(village.id) },
    });
    if (!row) {
      return NextResponse.json({ error: "Template tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (err) {
    console.error("GET /api/mail-templates/[id] error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
