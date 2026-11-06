import { auditPlatform } from "@/lib/platform/audit";
import { clearFailures, loginFailKeyAdmin, recordFailure } from "@/lib/platform/admins/login-guard";

/**
 * Jejak login admin platform (`admin.login`, `admin.login_failed`). Tidak pernah memuat sandi/kode. Kegagalan hanya dicatat
 * 5 kali pertama per jendela 15 menit lalu tiap kelipatan 10, supaya serangan tebak sandi tidak membanjiri tabel audit.
 */
const FAIL_WINDOW_MS = 15 * 60_000;

export type LoginFailReason = "password" | "totp" | "totp_locked";

export async function auditLoginFailure(req: Request, admin: { id: number; email: string }, reason: LoginFailReason): Promise<void> {
  try {
    const consecutive = await recordFailure(loginFailKeyAdmin(admin.id), { max: 1_000_000, windowMs: FAIL_WINDOW_MS });
    if (consecutive > 5 && consecutive % 10 !== 0) return;
    const what = reason === "password" ? "sandi salah" : reason === "totp" ? "kode 2FA salah" : "kode 2FA ditolak karena terkunci";
    await auditPlatform(req, { platformUserId: admin.id, email: admin.email }, {
      action: "admin.login_failed",
      targetType: "platform_user",
      targetId: admin.id,
      summary: `Percobaan masuk gagal (${what}); kegagalan beruntun: ${consecutive}.`,
      metadata: { reason, consecutive },
    });
  } catch (e) {
    console.error("[platform-login] gagal mencatat kegagalan:", e);
  }
}

export async function auditLoginSuccess(req: Request, admin: { id: number; email: string }, method: "password" | "totp" | "recovery", recoveryLeft?: number | null): Promise<void> {
  try {
    await clearFailures(loginFailKeyAdmin(admin.id));
    const label = method === "password" ? "sandi" : method === "totp" ? "sandi + kode 2FA" : "sandi + kode pemulihan";
    await auditPlatform(req, { platformUserId: admin.id, email: admin.email }, {
      action: "admin.login",
      targetType: "platform_user",
      targetId: admin.id,
      summary: `Masuk berhasil (${label}).`,
      metadata: { method, ...(method === "recovery" ? { recoveryCodesLeft: recoveryLeft ?? 0 } : {}) },
    });
  } catch (e) {
    console.error("[platform-login] gagal mencatat login:", e);
  }
}
