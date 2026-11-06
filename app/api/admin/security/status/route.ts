import { NextRequest } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/prisma";
import { parseRecoveryHashes } from "@/lib/platform/totp";
import { jsonNoStore } from "@/lib/platform/admins/http";

export const dynamic = "force-dynamic";

/** Status keamanan akun admin yang sedang masuk (2FA, sisa kode pemulihan). Tidak memuat rahasia. */
export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;
  const row = await prisma.platformUser.findUnique({
    where: { id: auth.admin.platformUserId },
    select: { email: true, name: true, lastLogin: true, totpEnabledAt: true, totpSecretEnc: true, recoveryCodeHashes: true },
  });
  if (!row) return jsonNoStore({ error: "Akun tidak ditemukan." }, { status: 404 });
  return jsonNoStore({
    email: row.email,
    name: row.name,
    lastLogin: row.lastLogin?.toISOString() ?? null,
    totpEnabled: row.totpEnabledAt != null,
    totpEnabledAt: row.totpEnabledAt?.toISOString() ?? null,
    setupPending: row.totpEnabledAt == null && row.totpSecretEnc != null,
    recoveryCodesLeft: row.totpEnabledAt ? parseRecoveryHashes(row.recoveryCodeHashes).length : 0,
  });
}
