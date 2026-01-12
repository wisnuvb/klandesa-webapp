/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth";
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
      villageId?: number;
      villageCode?: string;
      village?: Village;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
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

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  providers,
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        // Set domain untuk support subdomain
        // Development: .localhost untuk subdomain localhost
        // Production: .yourdomain.com
        domain:
          process.env.COOKIE_DOMAIN ||
          (process.env.NODE_ENV === "development" ? ".localhost" : undefined),
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
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

const handler = NextAuth(authOptions);
export const { handlers, signIn, signOut } = handler;

export async function auth() {
  return getServerSession(authOptions);
}
