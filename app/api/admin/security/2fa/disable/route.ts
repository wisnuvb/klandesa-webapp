import { NextRequest } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/prisma";
import { auditPlatformStrict } from "@/lib/platform/audit";
import { requireStepUp } from "@/lib/platform/step-up";
import { clientIpOf } from "@/lib/rbac/client-ip";
import { TWO_FACTOR_SELECT, clearTotp, verifySecondFactor } from "@/lib/platform/admins/two-factor";
import { jsonNoStore, readBody, secondFactorFailure } from "@/lib/platform/admins/http";

export const dynamic = "force-dynamic";

/** Nonaktifkan 2FA akun sendiri: sandi (step-up) + kode TOTP atau kode pemulihan. */
export async function POST(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  const admin = auth.admin;
  const body = await readBody(req);

  const step = await requireStepUp(admin.platformUserId, body.confirmPassword, { skipTotp: true, req });
  if (!step.ok) return step.response;

  const row = await prisma.platformUser.findUnique({ where: { id: admin.platformUserId }, select: TWO_FACTOR_SELECT });
  if (!row) return jsonNoStore({ error: "Akun tidak ditemukan." }, { status: 404 });
  if (!row.totpEnabledAt) return jsonNoStore({ error: "2FA belum aktif." }, { status: 409 });

  const check = await verifySecondFactor(row, body.code, clientIpOf(req));
  if (!check.ok) return secondFactorFailure(check);

  await auditPlatformStrict(req, { platformUserId: admin.platformUserId, email: admin.email }, {
    action: "admin.2fa_disable",
    targetType: "platform_user",
    targetId: admin.platformUserId,
    summary: "Menonaktifkan verifikasi dua langkah (2FA) untuk akun sendiri.",
    metadata: { via: check.method },
  });
  await clearTotp(admin.platformUserId);
  return jsonNoStore({ ok: true });
}
