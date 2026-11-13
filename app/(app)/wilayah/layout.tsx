import { auth } from "@/auth";
import { isRegionalAccount } from "@/lib/regional-session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Ringkasan Wilayah" };

export default async function WilayahLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/wilayah");
  }
  if (!isRegionalAccount(session)) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
