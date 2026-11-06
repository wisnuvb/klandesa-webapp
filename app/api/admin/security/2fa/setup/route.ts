import { NextRequest } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { formatSecretForManualEntry } from "@/lib/platform/totp";
import { beginSetup } from "@/lib/platform/admins/two-factor";
import { jsonNoStore } from "@/lib/platform/admins/http";

export const dynamic = "force-dynamic";

/**
 * Mulai pendaftaran 2FA: membuat rahasia SEMENTARA (disimpan terenkripsi, belum aktif) dan mengembalikan URI otpauth untuk
 * dirender sebagai QR DI PERANGKAT pengguna (rahasia tidak dikirim ke pihak ketiga). Belum mengubah perilaku login:
 * 2FA baru aktif setelah /2fa/enable berhasil dengan kode pertama.
 */
export async function POST(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  const { platformUserId, email } = auth.admin;

  const rl = await checkRateLimitDb(limiterKey("platform-2fa-setup", platformUserId), { max: 10, windowMs: 60 * 60_000 });
  if (!rl.ok) return jsonNoStore({ error: "Terlalu banyak permintaan. Coba lagi nanti." }, { status: 429 });

  const row = await prisma.platformUser.findUnique({ where: { id: platformUserId }, select: { totpEnabledAt: true } });
  if (row?.totpEnabledAt) return jsonNoStore({ error: "2FA sudah aktif. Nonaktifkan dulu bila ingin mendaftarkan perangkat baru." }, { status: 409 });

  const begun = await beginSetup(platformUserId, email);
  if (!begun) return jsonNoStore({ error: "2FA sudah aktif. Nonaktifkan dulu bila ingin mendaftarkan perangkat baru." }, { status: 409 });
  const { secret, uri } = begun;
  return jsonNoStore({ secret, manualKey: formatSecretForManualEntry(secret), uri, issuer: "Klandesa", account: email });
}
