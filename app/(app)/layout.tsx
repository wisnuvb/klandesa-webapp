import { auth } from "@/auth";
import { AppShell } from "./AppShell";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default async function AppLayout({ children }: AppLayoutProps) {
  const session = await auth();

  return <AppShell session={session}>{children}</AppShell>;
}
