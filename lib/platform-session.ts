import type { Session } from "next-auth";

const PLATFORM_ID_PREFIX = "pl:";

export function platformSessionUserId(platformUserId: number): string {
  return `${PLATFORM_ID_PREFIX}${platformUserId}`;
}

export function parsePlatformUserIdFromSessionUserId(
  userId: string | undefined | null,
): number | null {
  if (!userId || !userId.startsWith(PLATFORM_ID_PREFIX)) return null;
  const n = Number(userId.slice(PLATFORM_ID_PREFIX.length));
  return Number.isFinite(n) ? n : null;
}

export function isPlatformAccount(session: Session | null): boolean {
  if (!session?.user) return false;
  const u = session.user as Session["user"] & { accountType?: unknown };
  return u.accountType === "platform";
}

export type ParsedPlatformSession = {
  platformUserId: number;
  email: string;
  name: string;
  role: string;
};

export function getPlatformSession(session: Session | null): ParsedPlatformSession | null {
  if (!session?.user) return null;
  const pid = parsePlatformUserIdFromSessionUserId(session.user.id);
  if (pid == null) return null;
  const u = session.user as Session["user"] & {
    accountType?: unknown;
    email?: string | null;
    name?: string | null;
    role?: string | null;
  };
  if (u.accountType !== "platform") return null;
  return {
    platformUserId: pid,
    email: u.email ?? "",
    name: u.name ?? "",
    role: u.role ?? "",
  };
}
