import type { Session } from "next-auth";

const PARTNER_ID_PREFIX = "pt:";

export function partnerSessionUserId(partnerId: number): string {
  return `${PARTNER_ID_PREFIX}${partnerId}`;
}

export function parsePartnerIdFromSessionUserId(
  userId: string | undefined | null,
): number | null {
  if (!userId || !userId.startsWith(PARTNER_ID_PREFIX)) return null;
  const n = Number(userId.slice(PARTNER_ID_PREFIX.length));
  return Number.isFinite(n) ? n : null;
}

export function isPartnerAccount(session: Session | null): boolean {
  if (!session?.user) return false;
  const u = session.user as Session["user"] & { accountType?: string };
  return u.accountType === "partner";
}

export type ParsedPartnerSession = {
  partnerId: number;
  email: string;
  name: string;
};

export function getPartnerSession(session: Session | null): ParsedPartnerSession | null {
  if (!session?.user) return null;
  const pid = parsePartnerIdFromSessionUserId(session.user.id);
  if (pid == null) return null;
  const u = session.user as Session["user"] & {
    accountType?: string;
    email?: string | null;
    name?: string | null;
  };
  if (u.accountType !== "partner") return null;
  return {
    partnerId: pid,
    email: u.email ?? "",
    name: u.name ?? "",
  };
}
