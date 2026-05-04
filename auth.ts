/* eslint-disable @typescript-eslint/no-explicit-any */
import "@/env";
import { parse as parseCookieHeader } from "cookie";
import type { NextAuthOptions, DefaultSession, Session } from "next-auth";
import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getResolvedAuthSecret } from "@/lib/auth-secret";
import {
  jwtPayloadToSession,
  secureCookieForNextAuth,
  type JwtPayload,
} from "@/lib/session-from-token";
import { getServerSession } from "next-auth/next";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { RegionalScope } from "@/lib/regional-session";
import { regionalSessionUserId } from "@/lib/regional-session";
import { partnerSessionUserId } from "@/lib/partner-session";
import { platformSessionUserId } from "@/lib/platform-session";

// Village type untuk session
interface Village {
  id: number;
  code: string;
  name: string;
  district: string;
  regency: string;
  province: string;
  address: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
}

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role?: string;
      villageId?: number;
      villageCode?: string;
      village?: Village;
      partnerId?: number;
      accountType?: "village" | "regional" | "partner" | "platform";
      regionalScope?: RegionalScope;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    accessToken?: string;
    refreshToken?: string;
    villageId?: number;
    villageCode?: string;
    village?: Village;
    partnerId?: number;
    accountType?: "village" | "regional" | "partner" | "platform";
    regionalScope?: RegionalScope;
  }
}

const providers: any[] = [];

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  );
}

if (process.env.GOOGLE_ID && process.env.GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),
  );
}

providers.push(
  CredentialsProvider({
    id: "credentials",
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      // Panggilan server→server ke API login: pakai NEXTAUTH_URL_INTERNAL (mis. http://127.0.0.1:2042)
      // agar stabil; NEXTAUTH_URL tetap untuk origin di browser (mis. http://my.localhost:2042).
      const baseUrl =
        process.env.NEXTAUTH_URL_INTERNAL ||
        process.env.NEXTAUTH_URL ||
        "http://127.0.0.1:2042";

      try {
        const res = await fetch(`${baseUrl}/api/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: credentials?.email,
            password: credentials?.password,
          }),
        });

        const data = await res.json();

        if (res.ok && data.accountType === "regional" && data.user) {
          return {
            id: regionalSessionUserId(data.user.regionalUserId as number),
            name: data.user.name,
            email: data.user.email,
            image: null,
            role: data.user.role,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            accountType: "regional" as const,
            regionalScope: data.user.regionalScope as RegionalScope,
          };
        }

        if (res.ok && data.accountType === "partner" && data.user) {
          return {
            id: partnerSessionUserId(data.user.partnerId as number),
            name: data.user.name,
            email: data.user.email,
            image: null,
            role: data.user.role,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            accountType: "partner" as const,
            partnerId: data.user.partnerId as number,
          };
        }

        if (res.ok && data.accountType === "platform" && data.user) {
          return {
            id: platformSessionUserId(data.user.platformUserId as number),
            name: data.user.name,
            email: data.user.email,
            image: null,
            role: data.user.role,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            accountType: "platform" as const,
          };
        }

        if (res.ok && data.user) {
          return {
            id: String(data.user.id),
            name: data.user.name,
            email: data.user.email,
            image: null,
            role: data.user.role,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            accountType: "village" as const,
            villageId: data.user.village?.id,
            villageCode: data.user.village?.code,
            village: data.user.village
              ? {
                  id: data.user.village.id,
                  code: data.user.village.code,
                  name: data.user.village.name,
                  district: data.user.village.district || "",
                  regency: data.user.village.regency || "",
                  province: data.user.village.province || "",
                  address: data.user.village.address || "",
                  postalCode: data.user.village.postalCode,
                  phone: data.user.village.phone,
                  email: data.user.village.email,
                  website: data.user.village.website,
                  logoUrl: data.user.village.logoUrl,
                }
              : undefined,
          };
        }

        return null;
      } catch (error) {
        console.error("Auth error:", error);
        return null;
      }
    },
  }),
);

/**
 * Wajib konsisten untuk enkripsi cookie sesi JWE. NextAuth juga membaca NEXTAUTH_SECRET;
 * jangan biarkan keduanya beda atau kosong (bisa memicu JWT_SESSION_ERROR / hash "volatile").
 */
export const authSecret =
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";

/**
 * Domain cookie sesi:
 * - Jika COOKIE_DOMAIN di-set, selalu gunakan nilainya (termasuk .localhost untuk dev multi-subdomain).
 * - Jika tidak di-set, fallback host-only cookie.
 * - Untuk development localhost, gunakan undefined agar cookie bisa diakses dari localhost dan subdomains
 */
const sessionCookieDomain: string | undefined =
  process.env.COOKIE_DOMAIN?.trim() || undefined;

const resolvedAuthSecret = getResolvedAuthSecret();

if (process.env.NODE_ENV === "production" && !resolvedAuthSecret) {
  throw new Error(
    "AUTH_SECRET atau NEXTAUTH_SECRET harus di-set di environment (production).",
  );
}

export const authOptions: NextAuthOptions = {
  secret: resolvedAuthSecret,
  providers,
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  logger: {
    error(code, metadata) {
      if (code === "JWT_SESSION_ERROR") {
        console.warn(
          "[next-auth] Sesi tidak bisa didekripsi (cookie basi atau AUTH_SECRET/NEXTAUTH_SECRET berubah). Hapus cookie `next-auth.session-token` lalu login ulang. Pastikan NEXTAUTH_URL sama dengan URL di browser.",
        );
        return;
      }
      console.error(`[next-auth][${code}]`, metadata);
    },
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        ...(sessionCookieDomain ? { domain: sessionCookieDomain } : {}),
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as { role?: string }).role;
        token.accessToken = (user as any).accessToken;
        token.refreshToken = (user as any).refreshToken;
        const at = (user as any).accountType as
          | "village"
          | "regional"
          | "partner"
          | "platform"
          | undefined;
        token.accountType = at ?? "village";
        if (token.accountType === "regional") {
          token.regionalScope = (user as any).regionalScope;
          token.villageId = undefined;
          token.villageCode = undefined;
          token.village = undefined;
          token.partnerId = undefined;
        } else if (token.accountType === "partner") {
          token.partnerId = (user as any).partnerId;
          token.villageId = undefined;
          token.villageCode = undefined;
          token.village = undefined;
          token.regionalScope = undefined;
        } else if (token.accountType === "platform") {
          token.partnerId = undefined;
          token.villageId = undefined;
          token.villageCode = undefined;
          token.village = undefined;
          token.regionalScope = undefined;
        } else {
          token.partnerId = undefined;
          token.villageId = (user as any).villageId;
          token.villageCode = (user as any).villageCode;
          token.village = (user as any).village;
          token.regionalScope = undefined;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string | undefined;
        session.user.accountType =
          (token.accountType as
            | "village"
            | "regional"
            | "partner"
            | "platform"
            | undefined) ?? "village";
        session.user.regionalScope = token.regionalScope as
          | RegionalScope
          | undefined;
        session.user.villageId = token.villageId as number | undefined;
        session.user.villageCode = token.villageCode as string | undefined;
        session.user.village = token.village as Village | undefined;
        session.user.partnerId = token.partnerId as number | undefined;
      }
      (session as any).accessToken = token.accessToken;
      (session as any).refreshToken = token.refreshToken;
      return session;
    },
  },
};

function sessionFromJwtToken(token: JwtPayload | null): Session | null {
  const session = jwtPayloadToSession(token);
  if (!session?.user?.id) return null;
  if (token && typeof token === "object") {
    (session as any).accessToken = (token as any).accessToken;
    (session as any).refreshToken = (token as any).refreshToken;
  }
  return session;
}

/**
 * Satu sumber kebenaran untuk membaca sesi (RSC + Route Handler).
 * Selaras dengan alur getServerSession: cookie dari Header (parse) harus sama dengan
 * yang dipakai NextAuth di toInternalRequest — di beberapa versi App Router, req.cookies
 * kosong meski header Cookie lengkap, sehingga getToken(NextRequest) gagal.
 */
export async function readAppSession(
  req?: NextRequest | null,
): Promise<Session | null> {
  const secret = getResolvedAuthSecret();
  const secureCookie = secureCookieForNextAuth();

  try {
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) return session;
    } catch (e) {
      console.warn("[readAppSession] getServerSession error:", e);
    }

    if (req && secret) {
      const tokenFrom = async (
        tokenReq: NextRequest | Record<string, unknown>,
      ) => {
        const token = (await getToken({
          req: tokenReq as NextRequest,
          secret,
          secureCookie,
        })) as JwtPayload | null;
        return sessionFromJwtToken(token);
      };

      const fromNextCookies = await tokenFrom(req);
      if (fromNextCookies) return fromNextCookies;

      const rawCookie = req.headers.get("cookie");
      if (rawCookie) {
        const parsed = parseCookieHeader(rawCookie);
        const fromParsed = await tokenFrom({
          headers: Object.fromEntries(req.headers.entries()),
          cookies: parsed,
        });
        if (fromParsed) return fromParsed;
      }
    }

    if (!secret) return null;

    const cookieStore = await cookies();
    const headersList = await headers();
    const headerMap = Object.fromEntries(headersList.entries());
    const plainCookies = Object.fromEntries(
      cookieStore.getAll().map((c) => [c.name, c.value]),
    );

    for (const jar of [plainCookies, cookieStore]) {
      const token = (await getToken({
        req: {
          headers: headerMap,
          cookies: jar,
        } as unknown as NextRequest,
        secret,
        secureCookie,
      })) as JwtPayload | null;
      const decoded = sessionFromJwtToken(token);
      if (decoded) return decoded;
    }

    return null;
  } catch (error) {
    console.error("[readAppSession] Error:", error);
    return null;
  }
}

export async function auth(): Promise<Session | null> {
  return readAppSession(null);
}
