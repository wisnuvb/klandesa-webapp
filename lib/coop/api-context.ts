import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Village } from "@prisma/client";
import { getApiSession } from "@/lib/api-session";
import { authOptions } from "@/auth";
import { getToken } from "next-auth/jwt";
import { isRegionalAccount } from "@/lib/regional-session";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { prisma } from "@/lib/prisma";
import {
  effectiveCoopAccess,
  fetchCooperativeForVillage,
  fetchMembershipForUser,
  type CoopEffectiveAccess,
} from "@/lib/coop/access";
import { resolveVillageFromSession } from "@/lib/coop/resolve-village";

export type CoopApiContext = {
  village: Village;
  userId: number;
  villageRole: string | undefined;
  cooperative: NonNullable<Awaited<ReturnType<typeof fetchCooperativeForVillage>>>;
  membership: Awaited<ReturnType<typeof fetchMembershipForUser>>;
  access: NonNullable<CoopEffectiveAccess>;
};

/** Konteks lengkap dengan baris Cooperative wajib ada. */
export async function loadCoopApiContextWithCooperative(
  req: NextRequest,
): Promise<
  | { ok: true; ctx: CoopApiContext }
  | { ok: false; response: NextResponse }
> {
  const base = await loadCoopApiContextBase(req);
  if (!base.ok) return base;
  const { village, userId, villageRole } = base.ctx;
  if (!isVillageSubscriptionActive(village)) {
    return { ok: false, response: subscriptionBlockedResponse(village) };
  }
  const cooperative = await fetchCooperativeForVillage(village.id);
  if (!cooperative) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Koperasi belum dibuat untuk desa ini",
          code: "COOPERATIVE_MISSING",
        },
        { status: 404 },
      ),
    };
  }
  const membership = await fetchMembershipForUser(cooperative.id, userId);
  const access = effectiveCoopAccess(villageRole, membership);
  if (!access?.read) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return {
    ok: true,
    ctx: {
      village,
      userId,
      villageRole,
      cooperative,
      membership,
      access: access as NonNullable<typeof access>,
    },
  };
}

/** Tanpa Cooperative — untuk bootstrap. */
export async function loadCoopApiContextElevated(req: NextRequest): Promise<
  | { ok: true; ctx: { village: Village; userId: number; villageRole: string | undefined } }
  | { ok: false; response: NextResponse }
> {
  const base = await loadCoopApiContextBase(req);
  if (!base.ok) return base;
  const { village, userId, villageRole } = base.ctx;
  if (!isVillageSubscriptionActive(village)) {
    return { ok: false, response: subscriptionBlockedResponse(village) };
  }
  const access = effectiveCoopAccess(villageRole, null);
  if (!access?.manage) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, ctx: { village, userId, villageRole } };
}

async function loadCoopApiContextBase(req: NextRequest): Promise<
  | {
      ok: true;
      ctx: {
        village: Village;
        userId: number;
        villageRole: string | undefined;
      };
    }
  | { ok: false; response: NextResponse }
> {
  const session = await getApiSession(req);
  const token = await getToken({ req, secret: authOptions.secret });
  if (!session?.user?.id && !token?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (isRegionalAccount(session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const village = await resolveVillageFromSession(session, token);
  if (!village) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Desa tidak ditemukan" },
        { status: 404 },
      ),
    };
  }

  const userId = parseInt(String(session?.user?.id ?? token?.id ?? ""), 10);
  if (!Number.isFinite(userId)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { villageId: true, isActive: true },
  });
  if (!dbUser?.isActive || dbUser.villageId !== village.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    ctx: {
      village,
      userId,
      villageRole: session?.user?.role,
    },
  };
}

export function requireManage(ctx: CoopApiContext): NextResponse | null {
  if (!ctx.access.manage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
