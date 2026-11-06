import { NextRequest } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { auditPlatformStrict } from "@/lib/platform/audit";
import { requireStepUp } from "@/lib/platform/step-up";
import { validateNewPassword } from "@/lib/auth/password-policy";
import { clientIpOf } from "@/lib/rbac/client-ip";
import { sendTransactional } from "@/lib/email/send";
import { platformPasswordChangedEmail } from "@/lib/platform/admins/emails";
import { TWO_FACTOR_SELECT, verifySecondFactor } from "@/lib/platform/admins/two-factor";
import { jsonNoStore, readBody, secondFactorFailure } from "@/lib/platform/admins/http";

export const dynamic = "force-dynamic";

/**
 * Ganti kata sandi akun sendiri. Butuh sandi lama (step-up), kebijakan sandi yang sama dengan akun desa, dan kode 2FA bila aktif.
 * Menaikkan sessionVersion: SEMUA sesi (termasuk yang sekarang) berakhir; klien harus mengarahkan ke halaman masuk.
 */
export async function POST(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  const admin = auth.admin;
  const body = await readBody(req);

  const step = await requireStepUp(admin.platformUserId, body.currentPassword, { skipTotp: true, req });
  if (!step.ok) return step.response;

  const problem = validateNewPassword(body.newPassword);
  if (problem) return jsonNoStore({ error: problem }, { status: 400 });
  if (body.newPassword === body.currentPassword) return jsonNoStore({ error: "Kata sandi baru harus berbeda dari yang lama." }, { status: 400 });

  const row = await prisma.platformUser.findUnique({ where: { id: admin.platformUserId }, select: { ...TWO_FACTOR_SELECT, name: true, email: true } });
  if (!row) return jsonNoStore({ error: "Akun tidak ditemukan." }, { status: 404 });
  if (row.totpEnabledAt) {
    const check = await verifySecondFactor(row, body.totpCode, clientIpOf(req));
    if (!check.ok) return secondFactorFailure(check);
  }

  await auditPlatformStrict(req, { platformUserId: admin.platformUserId, email: admin.email }, {
    action: "admin.password_change",
    targetType: "platform_user",
    targetId: admin.platformUserId,
    summary: "Mengganti kata sandi akun sendiri (semua sesi dicabut).",
    metadata: { via: "self" },
  });
  const password = await hashPassword(body.newPassword as string);
  await prisma.$transaction([
    prisma.platformUser.update({ where: { id: admin.platformUserId }, data: { password, sessionVersion: { increment: 1 } } }),
    prisma.platformAuthToken.updateMany({ where: { platformUserId: admin.platformUserId, usedAt: null }, data: { usedAt: new Date() } }),
  ]);

  void sendTransactional({
    template: "password-changed",
    to: row.email,
    content: platformPasswordChangedEmail({ name: row.name, at: new Date() }),
  }).catch(() => undefined);

  return jsonNoStore({ ok: true, signedOut: true });
}
