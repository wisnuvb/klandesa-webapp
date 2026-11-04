import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { hashPassword } from "@/lib/auth";
import { validateNewPassword } from "@/lib/rbac/accounts";
import { consumeAuthToken, peekAuthToken } from "@/lib/rbac/access-links";
import { clientIpOf } from "@/lib/rbac/client-ip";
import { sendTransactional } from "@/lib/email/send";
import { passwordChangedEmail } from "@/lib/email/templates";
import { getAppOrigin } from "@/lib/email/app-origin";

const INVALID = "Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru.";

/** Membuat kata sandi lewat tautan email sekali pakai (undangan akun baru atau atur ulang). Publik; tautan itu sendiri rahasianya. */
export async function POST(req: NextRequest) {
  try {
    const rl = await checkRateLimitDb(limiterKey("pw-set-ip", clientIpOf(req)), { max: 20, windowMs: 60 * 60_000 });
    if (!rl.ok) {
      return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
    }

    const body = (await req.json().catch(() => null)) as { token?: unknown; password?: unknown } | null;
    const token = typeof body?.token === "string" ? body.token : "";
    // Validasi sandi SEBELUM memakai token, supaya sandi yang terlalu lemah tidak menghanguskan tautan.
    const problem = validateNewPassword(body?.password);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    const view = await peekAuthToken(prisma, token);
    if (!view) return NextResponse.json({ error: INVALID }, { status: 400 });
    if (!view.isActive) return NextResponse.json({ error: "Akun tidak aktif. Hubungi admin desa Anda." }, { status: 403 });

    const password = await hashPassword(body!.password as string);
    const result = await prisma.$transaction(async (tx) => {
      const used = await consumeAuthToken(tx, token);
      if (!used) return null;
      const user = await tx.user.update({ where: { id: used.userId }, data: { password, sessionVersion: { increment: 1 } }, select: { id: true, villageId: true, name: true, email: true } });
      // Semua tautan lain yang belum dipakai ikut hangus; sesi seluler lama dicabut.
      await tx.authToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
      await tx.mobileSession.updateMany({ where: { accountType: "staff", accountId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.auditLog.create({
        data: {
          villageId: user.villageId,
          userId: user.id,
          action: "update",
          entity: "users",
          entityId: String(user.id),
          changes: { passwordSet: used.purpose === "INVITE" ? "invite" : "reset" } as never,
          metadata: { via: "email-link" } as never,
          ipAddress: clientIpOf(req).slice(0, 50),
          userAgent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
        },
      });
      return { user, purpose: used.purpose };
    });
    if (!result) return NextResponse.json({ error: INVALID }, { status: 400 });

    // Pemberitahuan keamanan hanya untuk atur ulang (bukan pembuatan sandi pertama dari undangan).
    if (result.purpose === "RESET") {
      void sendTransactional({
        template: "password-changed",
        to: result.user.email,
        content: passwordChangedEmail({ name: result.user.name, at: new Date(), loginUrl: `${getAppOrigin()}/auth/lupa-sandi` }),
      }).catch(() => undefined);
    }

    return NextResponse.json({ success: true, email: result.user.email });
  } catch (err) {
    console.error("POST /api/auth/atur-sandi error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
