import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { mobileError } from "@/lib/mobile/context";
import { checkMobileRateLimit, clientIp } from "@/lib/mobile/rate-limit";
import { createMobileSession } from "@/lib/mobile/sessions";

/**
 * Login perangkat desa (email + password) — Fase 0.
 * Login warga (username + password) menyusul di Fase 1 dengan CitizenAccount.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limited = checkMobileRateLimit(`login:${ip}`, { max: 10, windowMs: 60_000 });
  if (!limited.ok) {
    return mobileError("RATE_LIMITED", "Terlalu banyak percobaan. Coba lagi sebentar.", 429, {
      retryAfterSec: limited.retryAfterSec,
    });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password || password.length > 200) {
    return mobileError("INVALID_REQUEST", "Email dan password harus diisi.", 400);
  }

  const user = await prisma.user.findUnique({ where: { email }, include: { village: true } });
  // Pesan sama untuk email tak dikenal & password salah (anti-enumerasi akun).
  const invalid = () => mobileError("UNAUTHENTICATED", "Email atau password salah.", 401);
  if (!user) return invalid();
  if (!(await verifyPassword(password, user.password))) return invalid();
  if (!user.isActive) return mobileError("ACCOUNT_DISABLED", "Akun Anda tidak aktif. Hubungi admin desa.", 403);
  if (!user.village.isActive) {
    return mobileError("VILLAGE_INACTIVE", "Layanan digital desa sedang tidak aktif. Silakan hubungi kantor desa.", 403);
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

  const tokens = await createMobileSession(
    { t: "staff", id: user.id, villageId: user.villageId, role: user.role },
    {
      deviceId: req.headers.get("x-device-id"),
      platform: req.headers.get("x-app-platform"),
      appVersion: req.headers.get("x-app-version"),
    },
  );

  return NextResponse.json({
    ...tokens,
    account: { type: "staff", id: user.id, name: user.name, role: user.role },
    village: { id: user.village.id, code: user.village.code, name: user.village.name, logoUrl: user.village.logoUrl },
  });
}
