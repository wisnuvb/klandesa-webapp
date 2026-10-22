import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { audit, requireStaff } from "@/lib/mobile/staff";
import { readCustomBannedWords, readSocialMode } from "@/lib/mobile/social-logic";

export async function GET(req: NextRequest) {
  const g = await requireStaff(req, "forum", "read");
  if (!g.ok) return g.response;
  const v = await prisma.village.findUnique({ where: { id: g.ctx.villageId }, select: { settings: true } });
  return NextResponse.json({ mode: readSocialMode(v?.settings), bannedWords: readCustomBannedWords(v?.settings) });
}

/** Atur mode (off | post | pre) dan kata terlarang tambahan. Hanya peran yang boleh mengubah pengaturan desa. */
export async function PATCH(req: NextRequest) {
  const g = await requireStaff(req, "settings", "update");
  if (!g.ok) return g.response;
  const { ctx } = g;
  const body = (await req.json().catch(() => null)) as { mode?: unknown; bannedWords?: unknown } | null;
  const mode = body?.mode;
  if (mode !== undefined && mode !== "off" && mode !== "post" && mode !== "pre") return mobileError("INVALID_REQUEST", "Mode tidak valid.", 400);
  const words = Array.isArray(body?.bannedWords)
    ? [...new Set(body.bannedWords.filter((w): w is string => typeof w === "string").map((w) => w.trim().toLowerCase()).filter((w) => w.length >= 3 && w.length <= 40))].slice(0, 200)
    : undefined;
  if (mode === undefined && words === undefined) return mobileError("INVALID_REQUEST", "Tidak ada yang diubah.", 400);

  const v = await prisma.village.findUnique({ where: { id: ctx.villageId }, select: { settings: true } });
  const root = v?.settings && typeof v.settings === "object" && !Array.isArray(v.settings) ? { ...(v.settings as Record<string, unknown>) } : {};
  const mobile = root.mobile && typeof root.mobile === "object" ? { ...(root.mobile as Record<string, unknown>) } : {};
  const social = mobile.social && typeof mobile.social === "object" ? { ...(mobile.social as Record<string, unknown>) } : {};
  if (mode !== undefined) social.mode = mode;
  if (words !== undefined) social.bannedWords = words;
  mobile.social = social;
  root.mobile = mobile;

  await prisma.village.update({ where: { id: ctx.villageId }, data: { settings: root as never } });
  void audit(ctx, req, "social_settings", "villages", ctx.villageId, { mode, bannedWords: words?.length });
  return new NextResponse(null, { status: 204 });
}
