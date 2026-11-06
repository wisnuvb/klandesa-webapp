import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { clientIpOf } from "@/lib/rbac/client-ip";
import { maskEmail } from "@/lib/rbac/access-links";
import { peekPlatformToken } from "@/lib/platform/admins/tokens";

/**
 * Melihat (TANPA memakai) tautan atur sandi admin platform. Token dikirim di BODY POST (bukan query string) karena tautan email
 * memuatnya di fragmen URL (#token=...) yang tidak pernah dikirim ke server/log akses. Publik; token 256-bit = rahasia.
 * Respons seragam `{ valid: false }` untuk token ngawur/terpakai/kedaluwarsa.
 */
export async function POST(req: NextRequest) {
  const rl = await checkRateLimitDb(limiterKey("platform-pw-peek-ip", clientIpOf(req)), { max: 60, windowMs: 60 * 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });

  const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const view = token ? await peekPlatformToken(prisma, token).catch(() => null) : null;
  const headers = { "Cache-Control": "no-store, max-age=0" };
  if (!view) return NextResponse.json({ valid: false }, { headers });
  if (!view.isActive) return NextResponse.json({ valid: false, inactive: true }, { headers });
  return NextResponse.json({ valid: true, purpose: view.purpose, name: view.name, emailMasked: maskEmail(view.email) }, { headers });
}
