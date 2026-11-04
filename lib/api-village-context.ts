import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import type { Village } from "@prisma/client";
import { getApiSession } from "@/lib/api-session";
import { isRegionalAccount } from "@/lib/regional-session";
import { prisma } from "@/lib/prisma";
import { isSessionRevoked, sessionRevokedResponse } from "@/lib/session-version";
import { resolveApiPermission } from "@/lib/permissions/api-route-map";
import { requirePermissionResponse } from "@/lib/permissions/require-permission";
import {
  assertSubscriptionForMethod,
  isSubscriptionExemptPath,
  applySubscriptionTransition,
} from "@/lib/subscription";
import { resolveModuleIdFromApiPath } from "@/lib/modules/api-route-map";
import { requireModuleEntitlement } from "@/lib/modules/require-module";

export function jsonUnauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function jsonForbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export type VillageApiContext = {
  session: Session;
  userId: number;
  village: Village;
  dbUser: {
    id: number;
    villageId: number;
    isActive: boolean;
    role: string;
    /** Penyesuaian izin per akun (JSON mentah). Nilai efektif: roleCan(resource, action, ctx.dbUser). */
    permissionOverrides: unknown;
    sessionVersion: number;
  };
};

/**
 * Lane app desa: wajib sesi NextAuth user desa aktif; desa dari DB (bukan fallback anonim).
 */
export async function requireVillageApiContext(
  req: NextRequest,
): Promise<
  { ok: true; ctx: VillageApiContext } | { ok: false; response: NextResponse }
> {
  const session = await getApiSession(req);
  if (!session?.user?.id) {
    return { ok: false, response: jsonUnauthorized() };
  }
  if (isRegionalAccount(session)) {
    return { ok: false, response: jsonForbidden() };
  }
  const sid = String(session.user.id);
  if (sid.startsWith("rg:")) {
    return { ok: false, response: jsonForbidden() };
  }
  const userId = parseInt(sid, 10);
  if (!Number.isFinite(userId)) {
    return { ok: false, response: jsonUnauthorized() };
  }

  // Akun + desanya dalam SATU query (JOIN; Prisma `relationJoins`) — dulu dua query berurutan di SETIAP request API desa.
  // Diukur: 2 query -> 1, hasil identik, 400 panggilan serentak 317 -> 88 ms. Sengaja TIDAK di-cache lintas request:
  // role/isActive/versi sesi harus langsung mengikuti perubahan admin (cache per proses tidak bisa dijamin di 8 worker).
  const row = await prisma.user.findUnique({
    where: { id: userId },
    relationLoadStrategy: "join",
    select: {
      id: true,
      villageId: true,
      isActive: true,
      role: true,
      permissionOverrides: true,
      sessionVersion: true,
      village: true,
    },
  });
  if (!row) {
    return { ok: false, response: jsonUnauthorized() };
  }
  const { village, ...dbUser } = row;
  if (!dbUser.isActive) {
    return { ok: false, response: jsonForbidden("Akun tidak aktif") };
  }
  // Kata sandi akun berubah sejak sesi ini dibuat -> sesi web lama ditolak (cookie curian ikut mati).
  if (isSessionRevoked(session.user.sessionVersion, dbUser.sessionVersion)) {
    return { ok: false, response: sessionRevokedResponse() };
  }

  if (!village) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Desa tidak ditemukan" }, { status: 404 }),
    };
  }

  if (
    session.user.villageId != null &&
    session.user.villageId !== village.id
  ) {
    return { ok: false, response: jsonForbidden("Konteks desa tidak cocok") };
  }
  if (
    session.user.villageCode &&
    session.user.villageCode !== village.code
  ) {
    return { ok: false, response: jsonForbidden("Konteks desa tidak cocok") };
  }

  // Role & penyesuaian izin selalu dari DB, bukan JWT: perubahan oleh admin berlaku pada permintaan berikutnya
  // tanpa menunggu pengguna masuk ulang, dan pencabutan tidak bisa dilewati dengan token lama.
  session.user.role = dbUser.role;
  session.user.permissionOverrides = dbUser.permissionOverrides;

  const apiPerm = resolveApiPermission(req.nextUrl.pathname, req.method);
  if (apiPerm) {
    const permErr = requirePermissionResponse(
      session,
      apiPerm.resource,
      apiPerm.action,
    );
    if (permErr) return { ok: false, response: permErr };
  }

  const pathname = req.nextUrl.pathname;
  if (!isSubscriptionExemptPath(pathname)) {
    // Baris desa baru dibaca ulang hanya bila transisi langganan menulisnya; selain itu `village`
    // (dibaca beberapa milidetik lalu pada permintaan yang sama) sudah yang terbaru.
    const { changed } = await applySubscriptionTransition(village.id, village);
    const freshVillage = changed
      ? await prisma.village.findUnique({ where: { id: village.id } })
      : village;
    if (freshVillage) {
      const subErr = assertSubscriptionForMethod(freshVillage, req.method);
      if (subErr) return { ok: false, response: subErr };

      const moduleId = resolveModuleIdFromApiPath(pathname);
      if (moduleId) {
        const modErr = await requireModuleEntitlement(freshVillage, moduleId);
        if (!modErr.ok) return { ok: false, response: modErr.response };
      }

      return {
        ok: true,
        ctx: { session, userId, village: freshVillage, dbUser },
      };
    }
  }

  return {
    ok: true,
    ctx: { session, userId, village, dbUser },
  };
}
