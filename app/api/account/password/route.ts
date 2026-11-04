import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { validateNewPassword } from "@/lib/rbac/accounts";

/** Ganti kata sandi akun sendiri (butuh kata sandi saat ini). Untuk semua akun desa. */
export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { userId } = loaded.ctx;

    const rl = await checkRateLimitDb(limiterKey("web-pw-change", userId), { max: 5, windowMs: 15 * 60_000 });
    if (!rl.ok) {
      return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
    }

    const body = (await req.json().catch(() => null)) as { currentPassword?: unknown; newPassword?: unknown } | null;
    const current = typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const problem = validateNewPassword(body?.newPassword);
    if (!current) return NextResponse.json({ error: "Kata sandi saat ini wajib diisi." }, { status: 400 });
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    if (current === body?.newPassword) return NextResponse.json({ error: "Kata sandi baru harus berbeda dari yang lama." }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
    if (!user || !(await verifyPassword(current, user.password))) {
      return NextResponse.json({ error: "Kata sandi saat ini salah." }, { status: 400 });
    }

    const password = await hashPassword(body!.newPassword as string);
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { password } }),
      // Ganti sandi = sesi seluler lama dicabut (refresh token yang bocor tidak boleh tetap hidup).
      prisma.mobileSession.updateMany({ where: { accountType: "staff", accountId: userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await auditWeb(req, loaded.ctx, "update", "users", userId, { passwordChanged: true });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/account/password error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
