import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import type { Village } from "@prisma/client";
import { getApiSession } from "@/lib/api-session";
import { isRegionalAccount } from "@/lib/regional-session";
import { prisma } from "@/lib/prisma";
import { resolveApiPermission } from "@/lib/permissions/api-route-map";
import { requirePermissionResponse } from "@/lib/permissions/require-permission";

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
  dbUser: { id: number; villageId: number; isActive: boolean; role: string };
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

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, villageId: true, isActive: true, role: true },
  });
  if (!dbUser) {
    return { ok: false, response: jsonUnauthorized() };
  }
  if (!dbUser.isActive) {
    return { ok: false, response: jsonForbidden("Akun tidak aktif") };
  }

  const village = await prisma.village.findUnique({
    where: { id: dbUser.villageId },
  });
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

  const apiPerm = resolveApiPermission(req.nextUrl.pathname, req.method);
  if (apiPerm) {
    const permErr = requirePermissionResponse(
      session,
      apiPerm.resource,
      apiPerm.action,
    );
    if (permErr) return { ok: false, response: permErr };
  }

  return {
    ok: true,
    ctx: { session, userId, village, dbUser },
  };
}
