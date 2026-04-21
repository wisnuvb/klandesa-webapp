import type { Session } from "next-auth";

export type JwtPayload = Record<string, unknown> & {
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  sub?: string;
  exp?: number;
  id?: string;
  role?: string;
  villageId?: number;
  villageCode?: string;
  village?: unknown;
};

/** Selaras dengan NEXTAUTH_URL (nama cookie __Secure- vs biasa). */
export function secureCookieForNextAuth(): boolean {
  const url = process.env.NEXTAUTH_URL ?? "";
  if (url.startsWith("https://")) return true;
  if (url.startsWith("http://")) return false;
  return Boolean(process.env.VERCEL);
}

export function jwtPayloadToSession(token: JwtPayload | null): Session | null {
  if (!token) return null;
  const id = String(token.id ?? token.sub ?? "");
  if (!id) return null;

  return {
    expires: token.exp
      ? new Date(Number(token.exp) * 1000).toISOString()
      : "",
    user: {
      id,
      name: token.name ?? null,
      email: token.email ?? null,
      image: (token.picture as string | undefined) ?? null,
      role: token.role as string | undefined,
      villageId: token.villageId as number | undefined,
      villageCode: token.villageCode as string | undefined,
      village: token.village as Session["user"] extends { village?: infer V }
        ? V
        : undefined,
    },
  } as Session;
}
