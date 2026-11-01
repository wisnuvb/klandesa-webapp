import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { mergeUkmSettings, parseUkmSettings } from "@/lib/mobile/ukm-logic";

/** Pengaturan UKM desa: apakah produk baru dari warga harus disetujui admin dulu. */
export async function GET(req: NextRequest) {
  const loaded = await requireVillageApiContext(req);
  if (!loaded.ok) return loaded.response;
  const row = await prisma.village.findUnique({ where: { id: loaded.ctx.village.id }, select: { settings: true } });
  return NextResponse.json(parseUkmSettings(row?.settings));
}

export async function PATCH(req: NextRequest) {
  const loaded = await requireVillageApiContext(req);
  if (!loaded.ok) return loaded.response;
  const { village } = loaded.ctx;

  const body = (await req.json().catch(() => null)) as { moderation?: unknown } | null;
  if (typeof body?.moderation !== "boolean") {
    return NextResponse.json({ error: "moderation harus true atau false" }, { status: 400 });
  }

  const row = await prisma.village.findUnique({ where: { id: village.id }, select: { settings: true } });
  const before = parseUkmSettings(row?.settings);
  const next = mergeUkmSettings(row?.settings, { moderation: body.moderation });
  await prisma.village.update({ where: { id: village.id }, data: { settings: next as Prisma.InputJsonValue } });

  await auditWeb(req, loaded.ctx, "update", "ukm_settings", village.id, {
    moderation: { from: before.moderation, to: body.moderation },
  });
  return NextResponse.json(parseUkmSettings(next));
}
