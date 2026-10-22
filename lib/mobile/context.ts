import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive } from "@/lib/subscription";
import { readBearer, verifyMobileAccessToken, type MobileAccountType } from "./tokens";

export type MobileApiCode =
  | "UNAUTHENTICATED"
  | "ACCOUNT_DISABLED"
  | "VILLAGE_INACTIVE"
  | "VILLAGE_READ_ONLY"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "INVALID_REQUEST";

export function mobileError(code: MobileApiCode, message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status });
}

export type MobileContext = {
  accountType: MobileAccountType;
  accountId: number;
  villageId: number;
  role: string;
  village: {
    id: number;
    code: string;
    name: string;
    logoUrl: string | null;
    subscriptionStatus: string;
    subscriptionExpiry: Date | null;
  };
};

type Loaded = { ok: true; ctx: MobileContext } | { ok: false; response: NextResponse };

/**
 * Guard route /api/mobile/v1/*: baca Authorization Bearer, pastikan akun & desa masih valid,
 * dan terapkan status langganan desa (GET = dapat dibaca saat grace; mutasi butuh aktif/trial).
 * Pesan error sengaja ramah warga (lihat docs/MOBILE_V2_PRODUCT_SPEC.md §7).
 */
export async function requireMobileContext(
  req: NextRequest,
  opts: { allow?: MobileAccountType[]; skipSubscription?: boolean } = {},
): Promise<Loaded> {
  const token = readBearer(req.headers.get("authorization"));
  const claims = token ? verifyMobileAccessToken(token) : null;
  if (!claims) {
    return { ok: false, response: mobileError("UNAUTHENTICATED", "Silakan masuk kembali.", 401) };
  }
  if (opts.allow && !opts.allow.includes(claims.t)) {
    return { ok: false, response: mobileError("FORBIDDEN", "Anda tidak punya akses ke fitur ini.", 403) };
  }

  const village = await prisma.village.findUnique({
    where: { id: claims.villageId },
    select: {
      id: true,
      code: true,
      name: true,
      logoUrl: true,
      isActive: true,
      subscriptionStatus: true,
      subscriptionExpiry: true,
    },
  });
  if (!village || !village.isActive) {
    return { ok: false, response: mobileError("VILLAGE_INACTIVE", "Layanan digital desa sedang tidak aktif. Silakan hubungi kantor desa.", 403) };
  }

  if (claims.t === "staff") {
    const user = await prisma.user.findUnique({
      where: { id: claims.id },
      select: { isActive: true, villageId: true, role: true },
    });
    if (!user || !user.isActive || user.villageId !== claims.villageId) {
      return { ok: false, response: mobileError("ACCOUNT_DISABLED", "Akun Anda tidak aktif. Hubungi admin desa.", 403) };
    }
    claims.role = user.role;
  }

  if (claims.t === "citizen") {
    const acc = await prisma.citizenAccount.findUnique({
      where: { id: claims.id },
      select: { status: true, deletedAt: true, villageId: true },
    });
    if (!acc || acc.deletedAt || acc.status !== "ACTIVE" || acc.villageId !== claims.villageId) {
      return { ok: false, response: mobileError("ACCOUNT_DISABLED", "Akun Anda tidak aktif. Hubungi kantor desa.", 403) };
    }
  }

  if (!opts.skipSubscription) {
    if (!isVillageSubscriptionActive(village, req.method)) {
      const readOnly = isVillageSubscriptionActive(village, "GET");
      return {
        ok: false,
        response: readOnly
          ? mobileError("VILLAGE_READ_ONLY", "Layanan desa sedang terbatas. Anda masih bisa melihat data, tetapi belum bisa mengirim.", 403)
          : mobileError("VILLAGE_INACTIVE", "Layanan digital desa sedang tidak aktif. Silakan hubungi kantor desa.", 403),
      };
    }
  }

  return {
    ok: true,
    ctx: {
      accountType: claims.t,
      accountId: claims.id,
      villageId: claims.villageId,
      role: claims.role,
      village: {
        id: village.id,
        code: village.code,
        name: village.name,
        logoUrl: village.logoUrl,
        subscriptionStatus: village.subscriptionStatus,
        subscriptionExpiry: village.subscriptionExpiry,
      },
    },
  };
}
