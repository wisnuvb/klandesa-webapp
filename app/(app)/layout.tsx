import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { INVOKE_PATHNAME_HEADER } from "@/lib/middleware-headers";
import { isRegionalAccount } from "@/lib/regional-session";
import { AppLayoutClient } from "./AppLayoutClient";
import type { Metadata } from "next";

/** Rute dashboard using auth + DB; don't make it static at build (without DB connection). */
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const headersList = await headers();
  const pathname = headersList.get(INVOKE_PATHNAME_HEADER) || "/";
  const isAuthRoute = pathname.startsWith("/auth");

  if (isAuthRoute) {
    return <AppLayoutClient>{children}</AppLayoutClient>;
  }

  const session = await auth();
  if (!session?.user?.id) {
    const safePath = pathname.startsWith("/") ? pathname : `/${pathname}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(safePath)}`);
  }

  const isWilayah = pathname.startsWith("/wilayah");
  if (isRegionalAccount(session)) {
    if (!isWilayah) {
      redirect("/wilayah");
    }
  } else if (isWilayah) {
    redirect("/dashboard");
  }

  return <AppLayoutClient>{children}</AppLayoutClient>;
}
