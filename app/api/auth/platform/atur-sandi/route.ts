import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { validateNewPassword } from "@/lib/auth/password-policy";
import { clientIpOf } from "@/lib/rbac/client-ip";
import { auditPlatform } from "@/lib/platform/audit";
import { consumePlatformToken, peekPlatformToken } from "@/lib/platform/admins/tokens";
import { sendTransactional } from "@/lib/email/send";
import { platformPasswordChangedEmail } from "@/lib/platform/admins/emails";

const INVALID = "Tautan tidak valid atau sudah kedaluwarsa. Minta admin platform lain mengirim tautan baru.";

/**
 * Membuat kata sandi admin platform lewat tautan sekali pakai (undangan atau atur ulang). Publik; token = rahasia.
 * Sekali pakai atomik, kebijakan sandi sama dengan akun desa, mencabut semua sesi lama (sessionVersion++).
 * 2FA admin TIDAK berubah (tautan saja tidak boleh melewati 2FA).
 */
export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimitDb(limiterKey("platform-pw-set-ip", clientIpOf(req)), { max: 20, windowMs: 60 * 60_000 });
    if (!rl.ok) {
      return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
    }

    const body = (await req.json().catch(() => null)) as { token?: unknown; password?: unknown } | null;
    const token = typeof body?.token === "string" ? body.token : "";
    // Validasi sandi SEBELUM memakai token, supaya sandi lemah tidak menghanguskan tautan.
    const problem = validateNewPassword(body?.password);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    const view = await peekPlatformToken(prisma, token);
    if (!view) return NextResponse.json({ error: INVALID }, { status: 400 });
    if (!view.isActive) return NextResponse.json({ error: "Akun tidak aktif. Hubungi admin platform lain." }, { status: 403 });

    const password = await hashPassword(body!.password as string);
    const result = await prisma.$transaction(async (tx) => {
      const used = await consumePlatformToken(tx, token);
      if (!used) return null;
      const user = await tx.platformUser.update({
        where: { id: used.platformUserId },
        data: { password, sessionVersion: { increment: 1 } },
        select: { id: true, name: true, email: true },
      });
      await tx.platformAuthToken.updateMany({ where: { platformUserId: user.id, usedAt: null }, data: { usedAt: new Date() } });
      return { user, purpose: used.purpose };
    });
    if (!result) return NextResponse.json({ error: INVALID }, { status: 400 });

    await auditPlatform(req, { platformUserId: result.user.id, email: result.user.email }, {
      action: "admin.password_change",
      targetType: "platform_user",
      targetId: result.user.id,
      summary: result.purpose === "INVITE" ? "Membuat kata sandi pertama lewat tautan undangan." : "Mengatur ulang kata sandi lewat tautan email.",
      metadata: { via: "email-link", purpose: result.purpose },
    });
    if (result.purpose === "RESET") {
      void sendTransactional({
        template: "password-changed",
        to: result.user.email,
        content: platformPasswordChangedEmail({ name: result.user.name, at: new Date() }),
      }).catch(() => undefined);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/auth/platform/atur-sandi error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
