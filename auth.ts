/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextAuthOptions, DefaultSession } from "next-auth";
import { getServerSession } from "next-auth/next";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

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
  }
}

const providers: any[] = [];

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  );
}

if (process.env.GOOGLE_ID && process.env.GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    })
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
      const baseUrl = process.env.NEXTAUTH_URL || "http://app.localhost:3004";

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

        if (res.ok && data.user) {
          return {
            id: data.user.id.toString(),
            name: data.user.name,
            email: data.user.email,
            image: null,
            role: data.user.role,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
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
  })
);

/**
 * Wajib konsisten untuk enkripsi cookie sesi JWE. NextAuth juga membaca NEXTAUTH_SECRET;
 * jangan biarkan keduanya beda atau kosong (bisa memicu JWT_SESSION_ERROR / hash "volatile").
 */
export const authSecret =
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";

/** Domain cookie: hanya jika NEXTAUTH_URL bukan localhost (cookie `Domain=` tidak cocok dengan host localhost). */
const sessionCookieDomain: string | undefined = (() => {
  const base = (process.env.NEXTAUTH_URL || "").toLowerCase();
  if (base.includes("localhost") || base.includes("127.0.0.1")) {
    return undefined;
  }
  return process.env.COOKIE_DOMAIN || undefined;
})();

const resolvedAuthSecret =
  authSecret ||
  (process.env.NODE_ENV !== "production"
    ? "__dev_only_nextauth_secret_min_32_chars_static__"
    : "");

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
        token.villageId = (user as any).villageId;
        token.villageCode = (user as any).villageCode;
        token.village = (user as any).village;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string | undefined;
        session.user.villageId = token.villageId as number | undefined;
        session.user.villageCode = token.villageCode as string | undefined;
        session.user.village = token.village as Village | undefined;
      }
      (session as any).accessToken = token.accessToken;
      (session as any).refreshToken = token.refreshToken;
      return session;
    },
  },
};

export async function auth() {
  return getServerSession(authOptions);
}
