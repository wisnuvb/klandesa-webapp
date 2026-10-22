import { NextRequest, NextResponse } from "next/server";
import { mobileError } from "@/lib/mobile/context";
import { prisma } from "@/lib/prisma";
import { checkMobileRateLimit, clientIp, pruneRateLimits } from "@/lib/mobile/rate-limit";
import { rotateMobileSession } from "@/lib/mobile/sessions";

export async function POST(req: NextRequest) {
  const limited = checkMobileRateLimit(`refresh:${clientIp(req)}`, { max: 30, windowMs: 60_000 });
  if (!limited.ok) {
    return mobileError("RATE_LIMITED", "Terlalu banyak percobaan. Coba lagi sebentar.", 429, {
      retryAfterSec: limited.retryAfterSec,
    });
  }
  // Pembersihan oportunistik (~1% permintaan): sesi kedaluwarsa/dicabut > 30 hari dan penghitung laju lama.
  if (Math.random() < 0.01) {
    void prisma.mobileSession.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date(Date.now() - 30 * 86_400_000) } }, { revokedAt: { lt: new Date(Date.now() - 30 * 86_400_000) } }] } }).catch(() => undefined);
    void pruneRateLimits().catch(() => undefined);
  }
  const body = (await req.json().catch(() => null)) as { refreshToken?: unknown } | null;
  const token = typeof body?.refreshToken === "string" ? body.refreshToken : "";
  if (!token || token.length > 200) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);

  const result = await rotateMobileSession(token, {
    appVersion: req.headers.get("x-app-version"),
  });
  if (!result.ok) {
    return mobileError("UNAUTHENTICATED", "Sesi berakhir. Silakan masuk kembali.", 401, { reason: result.reason });
  }
  return NextResponse.json(result.tokens);
}
