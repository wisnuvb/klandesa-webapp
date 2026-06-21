import type { Session } from "next-auth";
import { isRegionalRole } from "@/lib/regional-policy";

export type RegionalScopeLevel = "PROVINCE" | "REGENCY" | "DISTRICT";

export type RegionalScope = {
  level: RegionalScopeLevel;
  province?: string;
  regency: string;
  district?: string;
  kodeProvinsi?: string;
  kodeKabKota?: string;
};

export type ParsedRegionalSession = {
  regionalUserId: number;
  scope: RegionalScope;
  email: string;
  name: string;
  role: string;
};

const REGIONAL_ID_PREFIX = "rg:";

export function regionalSessionUserId(regionalUserId: number): string {
  return `${REGIONAL_ID_PREFIX}${regionalUserId}`;
}

export function parseRegionalUserIdFromSessionUserId(
  userId: string | undefined | null,
): number | null {
  if (!userId || !userId.startsWith(REGIONAL_ID_PREFIX)) return null;
  const n = Number(userId.slice(REGIONAL_ID_PREFIX.length));
  return Number.isFinite(n) ? n : null;
}

export function isRegionalAccount(session: Session | null): boolean {
  if (!session?.user) return false;
  const u = session.user as Session["user"] & {
    accountType?: string;
    regionalScope?: RegionalScope;
  };
  return (
    u.accountType === "regional" &&
    !!u.regionalScope &&
    isRegionalRole(u.role)
  );
}

export function getRegionalSession(
  session: Session | null,
): ParsedRegionalSession | null {
  if (!session?.user) return null;
  const rid = parseRegionalUserIdFromSessionUserId(session.user.id);
  if (rid == null) return null;
  const u = session.user as Session["user"] & {
    accountType?: string;
    regionalScope?: RegionalScope;
    email?: string | null;
    name?: string | null;
    role?: string | null;
  };
  if (
    u.accountType !== "regional" ||
    !u.regionalScope ||
    !isRegionalRole(u.role)
  )
    return null;
  const email = u.email ?? "";
  const name = u.name ?? "";
  const role = u.role ?? "";
  return {
    regionalUserId: rid,
    scope: u.regionalScope,
    email,
    name,
    role,
  };
}
