import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-session";
import { logRegionalAccess } from "@/lib/regional-audit";
import { checkRegionalRateLimit } from "@/lib/regional-rate-limit";
import {
  filterVillageIdsForAggregate,
  getRegionalSession,
  listVillagesInRegionalScope,
  type VillageInScope,
} from "@/lib/regional-scope";
import type { ParsedRegionalSession } from "@/lib/regional-session";

export type RegionalApiContext = {
  regional: ParsedRegionalSession;
  villages: VillageInScope[];
  villageIds: number[];
  req: NextRequest;
};

export async function requireRegionalApi(
  req: NextRequest,
  action: string,
  rateLimitKey = action,
): Promise<
  | { ok: true; ctx: RegionalApiContext }
  | { ok: false; response: NextResponse }
> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRegionalRateLimit(ip, rateLimitKey);
  if (!rl.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Terlalu banyak permintaan. Coba lagi nanti." },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfterSec) },
        },
      ),
    };
  }

  const session = await getApiSession(req);
  const regional = getRegionalSession(session);
  if (!regional) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 }),
    };
  }

  const villages = await listVillagesInRegionalScope(regional.scope);
  const villageIds = filterVillageIdsForAggregate(villages);

  await logRegionalAccess({
    regionalUserId: regional.regionalUserId,
    action,
    path: req.nextUrl.pathname,
    req,
  });

  return {
    ok: true,
    ctx: { regional, villages, villageIds, req },
  };
}
