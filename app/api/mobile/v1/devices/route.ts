import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";

const EXPO_TOKEN = /^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]{10,}\]$/;

/** Daftarkan token push perangkat. Token unik: berpindah akun = diambil alih akun terbaru. */
export async function POST(req: NextRequest) {
  const loaded = await requireMobileContext(req, { skipSubscription: true });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const expoToken = typeof body?.expoToken === "string" ? body.expoToken.trim() : "";
  const platform = typeof body?.platform === "string" ? body.platform.slice(0, 20) : "android";
  if (!EXPO_TOKEN.test(expoToken)) return mobileError("INVALID_REQUEST", "Token perangkat tidak valid.", 400);

  const appVersion = req.headers.get("x-app-version")?.slice(0, 20) ?? null;
  await prisma.deviceToken.upsert({
    where: { expoToken },
    create: { accountType: ctx.accountType, accountId: ctx.accountId, villageId: ctx.villageId, expoToken, platform, appVersion },
    update: {
      accountType: ctx.accountType,
      accountId: ctx.accountId,
      villageId: ctx.villageId,
      platform,
      appVersion,
      lastSeenAt: new Date(),
      disabledAt: null,
    },
  });
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(req: NextRequest) {
  const loaded = await requireMobileContext(req, { skipSubscription: true });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const body = (await req.json().catch(() => null)) as { expoToken?: unknown } | null;
  if (typeof body?.expoToken === "string") {
    await prisma.deviceToken.deleteMany({
      where: { expoToken: body.expoToken, accountType: ctx.accountType, accountId: ctx.accountId },
    });
  }
  return new NextResponse(null, { status: 204 });
}
