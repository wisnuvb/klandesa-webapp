import { NextRequest } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/prisma";
import { auditPlatformStrict } from "@/lib/platform/audit";
import { requireStepUp } from "@/lib/platform/step-up";
import { clientIpOf } from "@/lib/rbac/client-ip";
import { TWO_FACTOR_SELECT, activateTotp, verifySecondFactor } from "@/lib/platform/admins/two-factor";
import { jsonNoStore, readBody, secondFactorFailure } from "@/lib/platform/admins/http";

export const dynamic = "force-dynamic";

/** Aktifkan 2FA: kode pertama dari aplikasi autentikator + sandi (step-up). Kode pemulihan dikembalikan SEKALI. */
export async function POST(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  const admin = auth.admin;
  const body = await readBody(req);

  const step = await requireStepUp(admin.platformUserId, body.confirmPassword, { skipTotp: true, req });
  if (!step.ok) return step.response;

  const row = await prisma.platformUser.findUnique({ where: { id: admin.platformUserId }, select: TWO_FACTOR_SELECT });
  if (!row) return jsonNoStore({ error: "Akun tidak ditemukan." }, { status: 404 });
  if (row.totpEnabledAt) return jsonNoStore({ error: "2FA sudah aktif." }, { status: 409 });
  if (!row.totpSecretEnc) return jsonNoStore({ error: "Mulai pendaftaran 2FA terlebih dahulu." }, { status: 409 });

  const check = await verifySecondFactor(row, body.code, clientIpOf(req), { pending: true });
  if (!check.ok) return secondFactorFailure(check);

  await auditPlatformStrict(req, { platformUserId: admin.platformUserId, email: admin.email }, {
    action: "admin.2fa_enable",
    targetType: "platform_user",
    targetId: admin.platformUserId,
    summary: "Mengaktifkan verifikasi dua langkah (2FA) untuk akun sendiri.",
  });
  const recoveryCodes = await activateTotp(admin.platformUserId);
  return jsonNoStore({ ok: true, recoveryCodes });
}
