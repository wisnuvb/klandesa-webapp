import { getApiSession } from "@/lib/api-session";
import { authOptions } from "@/auth";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { isRegionalAccount } from "@/lib/regional-session";
import {
  effectiveCoopAccess,
  fetchCooperativeForVillage,
  fetchMembershipForUser,
  shouldShowCoopInSidebar,
  showCoopNavWhenNoCoopYet,
  usesCooperativeOnlyNav,
} from "@/lib/coop/access";
import { resolveVillageFromSession } from "@/lib/coop/resolve-village";

export async function GET(req: NextRequest) {
  const session = await getApiSession(req);
  const token = await getToken({ req, secret: authOptions.secret });
  if (!session?.user?.id && !token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isRegionalAccount(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const village = await resolveVillageFromSession(session, token);
  if (!village) {
    return NextResponse.json({ error: "Desa tidak ditemukan" }, { status: 404 });
  }

  const userId = parseInt(String(session?.user?.id ?? token?.id ?? ""), 10);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const villageRole = session?.user?.role;
  const cooperative = await fetchCooperativeForVillage(village.id);
  const membership = cooperative
    ? await fetchMembershipForUser(cooperative.id, userId)
    : null;

  const access = effectiveCoopAccess(villageRole, membership);
  const hasCoop = !!cooperative;
  const showMenu =
    (hasCoop && shouldShowCoopInSidebar(villageRole, membership)) ||
    (!hasCoop && showCoopNavWhenNoCoopYet(villageRole));

  return NextResponse.json({
    cooperativeId: cooperative?.id ?? null,
    hasCooperative: hasCoop,
    cooperative: cooperative
      ? {
          id: cooperative.id,
          name: cooperative.name,
        }
      : null,
    membership: membership
      ? {
          id: membership.id,
          coopAppRole: membership.coopAppRole,
          boardTitle: membership.boardTitle,
        }
      : null,
    showCoopMenu: showMenu,
    /** Sidebar minimal: hanya koperasi + profil/billing (bukan menu penuh desa). */
    cooperativeOnlyNav: usesCooperativeOnlyNav(villageRole, membership),
    canRead: access?.read ?? false,
    canManage: access?.manage ?? false,
    accessKind: access?.kind ?? null,
  });
}
