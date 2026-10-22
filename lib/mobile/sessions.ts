import { prisma } from "@/lib/prisma";
import {
  MOBILE_REFRESH_TTL_MS,
  type MobileAccountType,
  hashRefreshToken,
  newRefreshToken,
  newSessionFamilyId,
  signMobileAccessToken,
} from "./tokens";

export type SessionDevice = { deviceId?: string | null; platform?: string | null; appVersion?: string | null };

export type IssuedTokens = { accessToken: string; refreshToken: string; expiresIn: number };

function clip(v: string | null | undefined, max: number): string | null {
  const s = v?.trim();
  return s ? s.slice(0, max) : null;
}

export async function createMobileSession(
  who: { t: MobileAccountType; id: number; villageId: number; role: string },
  device: SessionDevice,
  now = new Date(),
): Promise<IssuedTokens> {
  const refreshToken = newRefreshToken();
  await prisma.mobileSession.create({
    data: {
      accountType: who.t,
      accountId: who.id,
      villageId: who.villageId,
      role: who.role,
      refreshHash: hashRefreshToken(refreshToken),
      familyId: newSessionFamilyId(),
      deviceId: clip(device.deviceId, 100),
      platform: clip(device.platform, 20),
      appVersion: clip(device.appVersion, 20),
      expiresAt: new Date(now.getTime() + MOBILE_REFRESH_TTL_MS),
    },
  });
  return { accessToken: signMobileAccessToken(who), refreshToken, expiresIn: 15 * 60 };
}

export type RotateResult =
  | { ok: true; tokens: IssuedTokens }
  | { ok: false; reason: "invalid" | "expired" | "reuse" };

/**
 * Putar refresh token. Token lama menjadi `prevHash`; bila token lama dipakai lagi
 * (sudah diputar) → seluruh keluarga sesi dicabut (indikasi token dicuri).
 */
export async function rotateMobileSession(
  presented: string,
  device: SessionDevice,
  now = new Date(),
): Promise<RotateResult> {
  const hash = hashRefreshToken(presented);
  const current = await prisma.mobileSession.findUnique({ where: { refreshHash: hash } });

  if (!current) {
    const reused = await prisma.mobileSession.findFirst({ where: { prevHash: hash } });
    if (reused) {
      await prisma.mobileSession.updateMany({
        where: { familyId: reused.familyId, revokedAt: null },
        data: { revokedAt: now },
      });
      return { ok: false, reason: "reuse" };
    }
    return { ok: false, reason: "invalid" };
  }
  if (current.revokedAt) return { ok: false, reason: "invalid" };
  if (current.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: "expired" };

  const next = newRefreshToken();
  const nextHash = hashRefreshToken(next);
  // Update bersyarat pada hash lama: dua permintaan paralel tidak bisa sama-sama menang.
  const updated = await prisma.mobileSession.updateMany({
    where: { id: current.id, refreshHash: hash, revokedAt: null },
    data: {
      refreshHash: nextHash,
      prevHash: hash,
      lastUsedAt: now,
      expiresAt: new Date(now.getTime() + MOBILE_REFRESH_TTL_MS),
      appVersion: clip(device.appVersion, 20) ?? current.appVersion,
    },
  });
  if (updated.count !== 1) return { ok: false, reason: "invalid" };

  const accessToken = signMobileAccessToken({
    t: current.accountType as MobileAccountType,
    id: current.accountId,
    villageId: current.villageId,
    role: current.role,
  });
  return { ok: true, tokens: { accessToken, refreshToken: next, expiresIn: 15 * 60 } };
}

export async function revokeMobileSession(refreshToken: string, now = new Date()): Promise<void> {
  await prisma.mobileSession.updateMany({
    where: { refreshHash: hashRefreshToken(refreshToken), revokedAt: null },
    data: { revokedAt: now },
  });
}
