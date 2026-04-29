/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { getSubdomain } from "@/lib/subdomain";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

interface ResolveVillageOptions {
  req?: NextRequest;
  queryVillageCode?: string;
  session?: Session | null;
  token?: any;
}

/**
 * Resolve village with priority:
 * 1. Session villageCode (if user is logged in)
 * 2. Token villageCode (if using API token)
 * 3. Query villageCode (for testing/manual override)
 * 4. Subdomain (for multi-tenant routing)
 * 5. DEFAULT_VILLAGE_CODE from env
 * 6. First village in database
 *
 * @returns Village object or null if not found
 */
export async function resolveVillage(
  options: ResolveVillageOptions = {}
): Promise<
  typeof prisma.village extends {
    findUnique: (...args: any) => Promise<infer T>;
  }
    ? T
    : null
> {
  const { req, queryVillageCode, session, token } = options;

  // Priority 1: Session villageCode (if user is logged in)
  if (session?.user?.villageCode) {
    const village = await prisma.village.findUnique({
      where: { code: session.user.villageCode },
    });
    if (village) return village;
  }

  // Priority 2: Token villageCode (if using API token)
  if (token?.villageCode) {
    const village = await prisma.village.findUnique({
      where: { code: token.villageCode },
    });
    if (village) return village;
  }

  // Priority 3: Query villageCode (for testing/manual override)
  if (queryVillageCode) {
    const village = await prisma.village.findUnique({
      where: { code: queryVillageCode },
    });
    if (village) return village;
  }

  // Priority 4: Subdomain (for multi-tenant routing)
  if (req) {
    const sub = getSubdomain(req);
    if (sub && sub !== "app" && sub !== "my") {
      const codes = [
        ...new Set([
          sub.trim(),
          sub.trim().toLowerCase(),
          sub.trim().toUpperCase(),
        ]),
      ];
      const village = await prisma.village.findFirst({
        where: { code: { in: codes } },
      });
      if (village) return village;
    }
  }

  // Priority 5: DEFAULT_VILLAGE_CODE from env
  const defaultCode = process.env.DEFAULT_VILLAGE_CODE;
  if (defaultCode) {
    const village = await prisma.village.findUnique({
      where: { code: defaultCode },
    });
    if (village) return village;
  }

  // Priority 6: First village in database (fallback)
  const firstVillage = await prisma.village.findFirst({
    orderBy: { id: "asc" },
  });

  return firstVillage;
}
