import "@/env";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, generateTokens, type JwtTokenPayloadVillage } from "@/lib/auth";
import { buildRegionalScopeFromUser } from "@/lib/regional-scope-user";
import { resolveLinkedPartnerIdForVillageEmail } from "@/lib/partner/resolve-linked-partner";
import { requireTurnstile } from "@/lib/turnstile";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { clientIpOf } from "@/lib/rbac/client-ip";
import { getDummyHash } from "@/lib/mobile/citizen-login";
import { isVillageRole } from "@/lib/permissions/roles";
import { gateVillage } from "@/lib/platform/villages/village-gate";
import { verifySecondFactor } from "@/lib/platform/admins/two-factor";
import { auditLoginFailure, auditLoginSuccess } from "@/lib/platform/admins/login";
import { lockedForSec, recordFailure } from "@/lib/platform/admins/login-guard";

const WINDOW_MS = 10 * 60_000;
const DISABLED_MSG = "Akun Anda tidak aktif. Hubungi administrator.";

const EMAIL_LIMIT = { max: 60, windowMs: 30 * 60_000 };
const emailLimitKey = (email: string) => limiterKey("web-login-email", email.toLowerCase());

/**
 * Batas percobaan login. Dihitung SEBELUM verifikasi sandi/Turnstile supaya tidak bisa dipakai menebak sandi:
 * - per IP (semua email): menahan satu sumber yang mencoba banyak akun;
 * - per IP + email: menahan penebakan satu akun dari satu sumber (tanpa mengunci pemilik asli yang IP-nya lain).
 * Dua batas di atas dinaikkan secara atomik sebelum sandi dinilai, jadi permintaan paralel tidak bisa menembusnya.
 * Batas per EMAIL (lintas IP) tidak dihitung di sini: hanya KEGAGALAN sandi yang dihitung (lihat `noteEmailFailure`) dan hanya
 * dibaca di `emailLockedForSec`, supaya pihak tak terautentikasi tidak bisa mengunci pemilik akun dengan membanjiri email-nya.
 */
async function loginRateLimited(ip: string, email: string): Promise<number | null> {
  const emailKey = email.toLowerCase();
  const checks = await Promise.all([
    checkRateLimitDb(limiterKey("web-login-ip", ip), { max: 40, windowMs: WINDOW_MS }),
    checkRateLimitDb(limiterKey("web-login-id", ip, emailKey), { max: 8, windowMs: WINDOW_MS }),
  ]);
  const blocked = checks.find((c) => !c.ok);
  return blocked && !blocked.ok ? blocked.retryAfterSec : null;
}

/**
 * Serangan terdistribusi ke satu akun desa/wilayah/mitra: setelah 60 KEGAGALAN sandi/30 menit lintas IP, email itu ditahan.
 * Akun admin platform DIKECUALIKAN (hanya terkena batas per IP+email): kalau tidak, siapa pun bisa mengunci owner. Konsekuensinya
 * email yang tak pernah ditahan bisa dibedakan dari yang ditahan hanya setelah ratusan kegagalan terdistribusi; kompensasinya: sandi admin
 * dilindungi bcrypt + 2FA dengan batasnya sendiri, dan admin lain bisa membuka kunci (aksi `unlock`).
 */
async function emailLockedForSec(email: string): Promise<number | null> {
  const locked = await lockedForSec(emailLimitKey(email), EMAIL_LIMIT);
  if (locked == null) return null;
  const isPlatform = await prisma.platformUser.findUnique({ where: { email }, select: { id: true } }).catch(() => null);
  return isPlatform ? null : locked;
}

/** Catat satu kegagalan sandi untuk email non-platform (tak pernah memblokir permintaan ini; hanya menaikkan hitungan). */
async function noteEmailFailure(email: string): Promise<void> {
  await recordFailure(emailLimitKey(email), EMAIL_LIMIT).catch(() => undefined);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const turnstileToken = typeof body?.turnstileToken === "string" ? body.turnstileToken : undefined;

    if (!email || !password || email.length > 255 || password.length > 200) {
      return NextResponse.json(
        { error: "Email dan password harus diisi" },
        { status: 400 },
      );
    }

    const retryAfterSec = await loginRateLimited(clientIpOf(request), email);
    const emailLock = retryAfterSec == null ? await emailLockedForSec(email) : null;
    const blockedSec = retryAfterSec ?? emailLock;
    if (blockedSec != null) {
      return NextResponse.json(
        {
          error: `Terlalu banyak percobaan masuk. Coba lagi dalam ${Math.max(1, Math.ceil(blockedSec / 60))} menit.`,
          code: "RATE_LIMITED",
        },
        { status: 429, headers: { "Retry-After": String(blockedSec) } },
      );
    }

    const turnstile = await requireTurnstile(request, turnstileToken);
    if (!turnstile.ok) return turnstile.response;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { village: true },
    });

    if (user) {
      // Sandi diperiksa DULU: status akun (nonaktif/peran) hanya diberitahukan kepada pemilik sandi yang benar,
      // sehingga halaman login tidak bisa dipakai menebak akun mana yang ada/nonaktif.
      const isPasswordValid = await verifyPassword(password, user.password);
      if (!isPasswordValid) {
        await noteEmailFailure(email);
        return NextResponse.json(
          { error: "Email atau password salah" },
          { status: 401 },
        );
      }
      if (!user.isActive) {
        return NextResponse.json({ error: DISABLED_MSG }, { status: 403 });
      }
      // Peran di luar daftar dikenal tidak boleh masuk (normalizeVillageRole akan menjadikannya staf).
      if (!isVillageRole(user.role)) {
        return NextResponse.json({ error: DISABLED_MSG }, { status: 403 });
      }
      // Desa dinonaktifkan admin platform: tolak masuk (setelah sandi benar, agar tidak jadi penebak status desa).
      const villageGate = gateVillage(user.village);
      if (villageGate) return villageGate;

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      const linkedPartnerId = await resolveLinkedPartnerIdForVillageEmail(user.email);

      const tokenPayload: JwtTokenPayloadVillage = {
        id: user.id,
        email: user.email,
        role: user.role,
        villageId: user.villageId,
        accountType: "village",
        ...(linkedPartnerId != null ? { partnerId: linkedPartnerId } : {}),
      };
      const { accessToken, refreshToken } = generateTokens(tokenPayload);

      return NextResponse.json({
        accountType: "village",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          sessionVersion: user.sessionVersion,
          ...(linkedPartnerId != null ? { partnerId: linkedPartnerId } : {}),
          village: {
            id: user.village.id,
            code: user.village.code,
            name: user.village.name,
            district: user.village.district,
            regency: user.village.regency,
            province: user.village.province,
            address: user.village.address,
            postalCode: user.village.postalCode,
            phone: user.village.phone,
            email: user.village.email,
            website: user.village.website,
            logoUrl: user.village.logoUrl,
          },
        },
        accessToken,
        refreshToken,
      });
    }

    const platformUser = await prisma.platformUser.findUnique({
      where: { email },
    });

    if (platformUser) {
      const isPlatformPasswordValid = await verifyPassword(
        password,
        platformUser.password,
      );
      if (!isPlatformPasswordValid) {
        // Di latar (tanpa await): waktu respons sandi-salah tidak boleh berbeda dari email yang tidak dikenal.
        void auditLoginFailure(request, platformUser, "password");
        return NextResponse.json(
          { error: "Email atau password salah" },
          { status: 401 },
        );
      }
      if (!platformUser.isActive) {
        return NextResponse.json({ error: DISABLED_MSG }, { status: 403 });
      }

      // 2FA: sandi benar BELUM cukup. Pesan TOTP_REQUIRED hanya keluar untuk pemilik sandi yang benar, jadi tidak membocorkan
      // apakah sebuah email adalah admin platform. Kode salah/terpakai memakai pesan seragam dan dibatasi (lihat login-guard).
      let loginMethod: "password" | "totp" | "recovery" = "password";
      let recoveryLeft: number | null = null;
      if (platformUser.totpEnabledAt) {
        const totpCode = typeof body?.totpCode === "string" ? body.totpCode.slice(0, 64) : "";
        if (!totpCode.trim()) {
          return NextResponse.json(
            { error: "Masukkan kode verifikasi 2FA Anda.", code: "TOTP_REQUIRED" },
            { status: 401 },
          );
        }
        const second = await verifySecondFactor(platformUser, totpCode, clientIpOf(request));
        if (!second.ok) {
          if (second.reason === "locked") {
            await auditLoginFailure(request, platformUser, "totp_locked");
            return NextResponse.json(
              {
                error: `Terlalu banyak kode salah. Coba lagi dalam ${Math.max(1, Math.ceil(second.retryAfterSec / 60))} menit.`,
                code: "RATE_LIMITED",
              },
              { status: 429, headers: { "Retry-After": String(second.retryAfterSec) } },
            );
          }
          await auditLoginFailure(request, platformUser, "totp");
          return NextResponse.json(
            { error: "Kode verifikasi salah atau sudah dipakai.", code: "TOTP_INVALID" },
            { status: 401 },
          );
        }
        loginMethod = second.method;
        recoveryLeft = second.recoveryLeft;
      }

      await prisma.platformUser.update({
        where: { id: platformUser.id },
        data: { lastLogin: new Date() },
      });
      await auditLoginSuccess(request, platformUser, loginMethod, recoveryLeft);

      const { accessToken, refreshToken } = generateTokens({
        id: platformUser.id,
        email: platformUser.email,
        role: platformUser.role,
        accountType: "platform",
      });

      return NextResponse.json({
        accountType: "platform",
        user: {
          platformUserId: platformUser.id,
          email: platformUser.email,
          name: platformUser.name,
          role: platformUser.role,
          sessionVersion: platformUser.sessionVersion,
        },
        accessToken,
        refreshToken,
      });
    }

    const regionalUser = await prisma.regionalUser.findUnique({
      where: { email },
    });

    if (regionalUser) {
      const isRegionalPasswordValid = await verifyPassword(
        password,
        regionalUser.password,
      );
      if (!isRegionalPasswordValid) {
        await noteEmailFailure(email);
        return NextResponse.json(
          { error: "Email atau password salah" },
          { status: 401 },
        );
      }
      if (!regionalUser.isActive) {
        return NextResponse.json({ error: DISABLED_MSG }, { status: 403 });
      }

      const regionalScope = buildRegionalScopeFromUser(regionalUser);
      if (!regionalScope) {
        return NextResponse.json(
          { error: "Akun wilayah tidak valid. Hubungi administrator." },
          { status: 403 },
        );
      }

      await prisma.regionalUser.update({
        where: { id: regionalUser.id },
        data: { lastLogin: new Date() },
      });

      const { accessToken, refreshToken } = generateTokens({
        id: regionalUser.id,
        email: regionalUser.email,
        role: regionalUser.role,
        accountType: "regional",
      });

      return NextResponse.json({
        accountType: "regional",
        user: {
          regionalUserId: regionalUser.id,
          email: regionalUser.email,
          name: regionalUser.name,
          role: regionalUser.role,
          regionalScope,
          sessionVersion: regionalUser.sessionVersion,
        },
        accessToken,
        refreshToken,
      });
    }

    const partner = await prisma.partner.findUnique({
      where: { email },
    });

    if (!partner) {
      // Samakan waktu respons dengan akun yang ada (bcrypt) agar keberadaan email tidak bisa diukur dari latensi.
      await verifyPassword(password, await getDummyHash()).catch(() => false);
      await noteEmailFailure(email);
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 401 },
      );
    }

    const isPartnerPasswordValid = await verifyPassword(password, partner.password);
    if (!isPartnerPasswordValid) {
      await noteEmailFailure(email);
      return NextResponse.json(
        { error: "Email atau password salah" },
        { status: 401 },
      );
    }
    if (partner.status !== "active") {
      return NextResponse.json({ error: DISABLED_MSG }, { status: 403 });
    }

    await prisma.partner.update({
      where: { id: partner.id },
      data: { lastLogin: new Date() },
    });

    const { accessToken, refreshToken } = generateTokens({
      id: partner.id,
      email: partner.email,
      role: "partner",
      accountType: "partner",
    });

    return NextResponse.json({
      accountType: "partner",
      user: {
        partnerId: partner.id,
        email: partner.email,
        name: partner.name,
        role: "partner",
        sessionVersion: partner.sessionVersion,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
