import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { getDummyHash } from "@/lib/mobile/citizen-login";
import { clientIpOf } from "@/lib/rbac/client-ip";
import { clearFailures, reserveAttempt, stepUpFailKeyAdmin } from "@/lib/platform/admins/login-guard";
import { limiterKey } from "@/lib/mobile/rate-limit";
import { TWO_FACTOR_SELECT, verifySecondFactor } from "@/lib/platform/admins/two-factor";

/**
 * Konfirmasi ulang sandi ("step-up") untuk tindakan super admin yang berisiko (reset/nonaktifkan akun, ubah langganan,
 * kelola admin, lihat data sensitif). Sesi 30 hari yang dicuri tidak cukup untuk menjalankan aksi ini: pelaku masih
 * butuh sandi admin, dan kode 2FA (TOTP/pemulihan) bila akun itu memakai 2FA. Tanpa penyimpanan token: sandi dan kode
 * dikirim di body (`confirmPassword`, `totpCode`) pada setiap aksi berisiko.
 *
 * Pembatas, dengan RESERVASI atomik SEBELUM sandi dinilai (permintaan paralel tidak bisa menilai lebih dari batas):
 * (1) 8 percobaan/10 menit per pasangan (admin, IP): pemegang cookie curian dari IP lain TIDAK bisa menguras jatah pemilik sah;
 * (2) plafon 24 percobaan/10 menit per admin (semua IP) sebagai batas tebakan terdistribusi. Sukses menghapus kedua hitungan.
 * Setelah terkunci, bahkan sandi benar ditolak (429) sampai jendela berakhir; admin lain dapat membuka kunci (`unlock`).
 * Kode 2FA memakai pembatas 2FA yang sama dengan login (5/15 menit per admin), dinilai hanya setelah sandi benar.
 */
const WINDOW_MS = 10 * 60_000;
const MAX_ATTEMPTS = 8;
const MAX_ATTEMPTS_PER_ADMIN = 24;

export type StepUpResult = { ok: true } | { ok: false; response: NextResponse };

export type StepUpOptions = {
  /** Kode TOTP 6 digit atau kode pemulihan dari body (`body.totpCode`). */
  totpCode?: unknown;
  /** Permintaan asal (untuk IP pembatas 2FA). */
  req?: Request;
  /** Rute yang sudah menilai faktor kedua sendiri (ganti sandi, nonaktifkan 2FA, buat ulang kode pemulihan): jangan dinilai dua kali. */
  skipTotp?: boolean;
};

const fail = (status: number, error: string, code: string, headers?: Record<string, string>) =>
  ({ ok: false, response: NextResponse.json({ error, code }, { status, ...(headers ? { headers } : {}) }) }) as const;

export async function requireStepUp(platformUserId: number, confirmPassword: unknown, o: StepUpOptions = {}): Promise<StepUpResult> {
  if (typeof confirmPassword !== "string" || confirmPassword.length === 0 || confirmPassword.length > 200) {
    return fail(403, "Konfirmasi dengan kata sandi Anda untuk melanjutkan.", "STEP_UP_REQUIRED");
  }

  const row = await prisma.platformUser.findUnique({ where: { id: platformUserId }, select: { password: true, isActive: true, ...TWO_FACTOR_SELECT } });
  const totpRequired = Boolean(row?.totpEnabledAt) && !o.skipTotp;
  const totpCode = typeof o.totpCode === "string" ? o.totpCode.trim().slice(0, 64) : "";
  // Kode kosong ditolak SEBELUM menyentuh pembatas/bcrypt: bukan percobaan menebak, hanya formulir yang belum lengkap.
  if (row && totpRequired && !totpCode) {
    return fail(403, "Masukkan kode 2FA Anda (atau kode pemulihan) untuk melanjutkan.", "STEP_UP_TOTP_REQUIRED");
  }

  const failKey = stepUpFailKeyAdmin(platformUserId);
  const ipKey = limiterKey("platform-stepup-fail-ip", platformUserId, o.req ? clientIpOf(o.req) : "unknown");
  const rlIp = await reserveAttempt(ipKey, { max: MAX_ATTEMPTS, windowMs: WINDOW_MS });
  if (!rlIp.ok) {
    return fail(429, "Terlalu banyak konfirmasi sandi yang salah. Coba lagi nanti.", "RATE_LIMITED", { "Retry-After": String(rlIp.retryAfterSec) });
  }
  const rl = await reserveAttempt(failKey, { max: MAX_ATTEMPTS_PER_ADMIN, windowMs: WINDOW_MS });
  if (!rl.ok) {
    return fail(429, "Terlalu banyak konfirmasi sandi yang salah. Coba lagi nanti.", "RATE_LIMITED", { "Retry-After": String(rl.retryAfterSec) });
  }

  // Selalu jalankan satu perbandingan bcrypt (dummy bila akun tak ada) agar waktu respons seragam.
  const valid = await verifyPassword(confirmPassword, row?.password ?? (await getDummyHash()));
  if (!row || !row.isActive || !valid) return fail(403, "Kata sandi konfirmasi salah.", "STEP_UP_INVALID");

  if (totpRequired) {
    const second = await verifySecondFactor(row, totpCode, o.req ? clientIpOf(o.req) : "unknown", { scope: "stepup" });
    if (!second.ok) {
      if (second.reason === "locked") {
        return fail(429, "Terlalu banyak kode 2FA yang salah. Coba lagi nanti.", "RATE_LIMITED", { "Retry-After": String(second.retryAfterSec) });
      }
      return fail(403, "Kode 2FA salah atau sudah dipakai. Bila baru saja memakainya, tunggu kode berikutnya.", "STEP_UP_TOTP_INVALID");
    }
  }

  await clearFailures(failKey);
  await clearFailures(ipKey);
  return { ok: true };
}
