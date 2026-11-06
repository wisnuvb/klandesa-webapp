import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { limiterKey } from "@/lib/mobile/rate-limit";
import {
  base32Decode,
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  matchRecoveryHash,
  normalizeRecoveryCode,
  normalizeTotpCode,
  otpauthUri,
  parseRecoveryHashes,
  totpAad,
  verifyTotp,
} from "@/lib/platform/totp";
import { clearFailures, releaseTotpSuccess, reserveTotpAttempt, totpFailKeyAdmin } from "@/lib/platform/admins/login-guard";

/** Bagian baris PlatformUser yang dibutuhkan untuk menilai faktor kedua. */
export type TwoFactorRow = {
  id: number;
  totpSecretEnc: string | null;
  totpEnabledAt: Date | null;
  recoveryCodeHashes: unknown;
};

export const TWO_FACTOR_SELECT = { id: true, totpSecretEnc: true, totpEnabledAt: true, recoveryCodeHashes: true } as const;

export type SecondFactorResult =
  | { ok: true; method: "totp" | "recovery"; recoveryLeft: number | null }
  | { ok: false; reason: "locked"; retryAfterSec: number }
  | { ok: false; reason: "invalid"; consecutive: number };

/** Satu langkah TOTP hanya boleh dipakai SEKALI per admin: kunci unik di mobile_rate_limits (P2002 = sudah dipakai). */
async function claimStep(platformUserId: number, step: number, scope: "login" | "stepup"): Promise<boolean> {
  try {
    await prisma.mobileRateLimit.create({ data: { key: limiterKey(scope === "stepup" ? "platform-totp-step-up" : "platform-totp-step", platformUserId, step), count: 1, windowStart: new Date() } });
    return true;
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return false;
    throw e;
  }
}

/** Pakai kode pemulihan secara ATOMIK (baris admin dikunci). Mengembalikan sisa kode atau null bila tak cocok. */
async function consumeRecoveryCode(platformUserId: number, input: string): Promise<number | null> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM platform_users WHERE id = ${platformUserId} FOR UPDATE`;
    const row = await tx.platformUser.findUnique({ where: { id: platformUserId }, select: { recoveryCodeHashes: true } });
    const hashes = parseRecoveryHashes(row?.recoveryCodeHashes);
    const match = matchRecoveryHash(hashes, input);
    if (!match) return null;
    const rest = hashes.filter((h) => h !== match);
    await tx.platformUser.update({ where: { id: platformUserId }, data: { recoveryCodeHashes: rest as never } });
    return rest.length;
  });
}

/**
 * Nilai kode 2FA (TOTP 6 digit atau kode pemulihan). Urutan: RESERVASI atomik (hitungan naik SEBELUM dinilai, jadi permintaan
 * paralel tidak bisa lolos dari batas) → nilai → sukses menghapus hitungan admin (dan mengembalikan jatah IP).
 * Setelah terkunci, kode benar pun ditolak. `pending: true` = pendaftaran (rahasia belum aktif; kode pemulihan tidak diterima).
 * `scope: "stepup"` memakai ruang pakai-sekali TOTP terpisah dari login (kode yang baru dipakai masuk tetap bisa dipakai konfirmasi).
 */
export async function verifySecondFactor(
  row: TwoFactorRow,
  input: unknown,
  ip: string,
  o: { pending?: boolean; now?: number; scope?: "login" | "stepup" } = {},
): Promise<SecondFactorResult> {
  const reservation = await reserveTotpAttempt(row.id, ip);
  if (!reservation.ok) return { ok: false, reason: "locked", retryAfterSec: reservation.retryAfterSec };

  const text = typeof input === "string" ? input.trim() : "";
  const totp = normalizeTotpCode(text);
  if (totp) {
    const secret = decryptTotpSecret(row.totpSecretEnc, totpAad(row.id));
    if (secret === null && row.totpSecretEnc) console.error(`[platform-2fa] rahasia TOTP admin ${row.id} tidak terbaca (kunci server berubah?)`);
    const hit = secret ? verifyTotp(base32Decode(secret), totp, o.now ?? Date.now()) : null;
    if (hit && (await claimStep(row.id, hit.step, o.scope ?? "login"))) {
      await releaseTotpSuccess(row.id, ip);
      return { ok: true, method: "totp", recoveryLeft: null };
    }
  } else if (!o.pending && normalizeRecoveryCode(text)) {
    const left = await consumeRecoveryCode(row.id, text);
    if (left !== null) {
      await releaseTotpSuccess(row.id, ip);
      return { ok: true, method: "recovery", recoveryLeft: left };
    }
  }
  // Reservasi tetap dihitung sebagai kegagalan (tidak ada penambahan kedua).
  return { ok: false, reason: "invalid", consecutive: reservation.count };
}

/** Simpan rahasia SEMENTARA (terenkripsi; `totpEnabledAt` tetap null = login belum meminta kode). */
export async function beginSetup(platformUserId: number, email: string): Promise<{ secret: string; uri: string } | null> {
  const secret = generateTotpSecret();
  // Bersyarat: hanya akun yang 2FA-nya BELUM aktif. Pendaftaran paralel/terlambat tidak boleh menimpa rahasia 2FA yang aktif.
  const r = await prisma.platformUser.updateMany({
    where: { id: platformUserId, totpEnabledAt: null },
    data: { totpSecretEnc: encryptTotpSecret(secret, totpAad(platformUserId)) },
  });
  if (r.count !== 1) return null;
  return { secret, uri: otpauthUri({ secretBase32: secret, accountEmail: email }) };
}

/** Aktifkan 2FA + simpan hash kode pemulihan baru. Kode mentah dikembalikan SEKALI. */
export async function activateTotp(platformUserId: number): Promise<string[]> {
  const { codes, hashes } = generateRecoveryCodes();
  await prisma.platformUser.update({ where: { id: platformUserId }, data: { totpEnabledAt: new Date(), recoveryCodeHashes: hashes as never } });
  return codes;
}

export async function replaceRecoveryCodes(platformUserId: number): Promise<string[]> {
  const { codes, hashes } = generateRecoveryCodes();
  await prisma.platformUser.update({ where: { id: platformUserId }, data: { recoveryCodeHashes: hashes as never } });
  return codes;
}

/** Hapus 2FA. `revokeSessions` menaikkan sessionVersion (dipakai saat admin lain mereset). */
export async function clearTotp(platformUserId: number, o: { revokeSessions?: boolean } = {}): Promise<void> {
  await prisma.platformUser.update({
    where: { id: platformUserId },
    data: { totpSecretEnc: null, totpEnabledAt: null, recoveryCodeHashes: Prisma.DbNull, ...(o.revokeSessions ? { sessionVersion: { increment: 1 } } : {}) },
  });
  await clearFailures(totpFailKeyAdmin(platformUserId));
}
