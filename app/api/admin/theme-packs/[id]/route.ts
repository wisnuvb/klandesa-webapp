import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { validateThemePackManifest } from "@/lib/website-engine/theme-pack-manifest";
import { listRegisteredPackKeys } from "@/lib/website-engine/template-packs/registry";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  const row = await prisma.websiteThemePack.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 404 });

  // Hasil validasi ulang ikut dikirim agar reviewer melihat masalah tanpa menebak.
  const validation = validateThemePackManifest(row.manifest, { reservedKeys: listRegisteredPackKeys() });
  return NextResponse.json({
    pack: row,
    validation: validation.ok ? { ok: true } : { ok: false, errors: validation.errors },
  });
}
