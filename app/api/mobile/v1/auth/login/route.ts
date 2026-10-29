import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { mobileError } from "@/lib/mobile/context";
import { checkRateLimitDb, clientIp, limiterKey } from "@/lib/mobile/rate-limit";
import { createMobileSession } from "@/lib/mobile/sessions";
import { getDummyHash, loginCitizen } from "@/lib/mobile/citizen-login";

/**
 * Login satu pintu: `identifier` berisi "@" → perangkat desa (email), selain itu → warga (username).
 * Field lama `email` tetap diterima untuk kompatibilitas.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  // Batas per IP (semua identitas) — dihitung bersama lintas worker lewat DB.
  const perIp = await checkRateLimitDb(limiterKey("login-ip", ip), { max: 30, windowMs: 10 * 60_000 });
  if (!perIp.ok) {
    return mobileError("RATE_LIMITED", "Terlalu banyak percobaan. Coba lagi sebentar.", 429, { retryAfterSec: perIp.retryAfterSec });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const identifier = String(body?.identifier ?? body?.email ?? "").trim().toLowerCase();
  const password = typeof body?.password === "string" ? body.password : "";
  if (!identifier || !password || password.length > 200 || identifier.length > 255) {
    return mobileError("INVALID_REQUEST", "Email dan password harus diisi.", 400);
  }
  // Batas per (IP + identitas): berlaku sama untuk identitas yang ada maupun tidak, jadi tidak membocorkan keberadaan akun.
  const perId = await checkRateLimitDb(limiterKey("login-id", ip, identifier), { max: 8, windowMs: 15 * 60_000 });
  if (!perId.ok) {
    return mobileError("RATE_LIMITED", "Terlalu banyak percobaan. Coba lagi sebentar.", 429, { retryAfterSec: perId.retryAfterSec });
  }
  if (!identifier.includes("@")) return loginCitizen(req, identifier, password);
  const email = identifier;

  const user = await prisma.user.findUnique({ where: { email }, include: { village: true } });
  // Pesan sama untuk email tak dikenal & password salah (anti-enumerasi akun).
  const invalid = () => mobileError("UNAUTHENTICATED", "Email atau password salah.", 401);
  if (!user) {
    await verifyPassword(password, await getDummyHash()).catch(() => false); // samakan waktu respons
    return invalid();
  }
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
