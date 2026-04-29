import { auth } from "@/auth";
import { isRegionalAccount } from "@/lib/regional-session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (isRegionalAccount(session)) {
    redirect("/wilayah");
  }
  return <>{children}</>;
}
