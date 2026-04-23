import { AppLayoutClient } from "./AppLayoutClient";

/** Rute dashboard using auth + DB; don't make it static at build (without DB connection). */
export const dynamic = "force-dynamic";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return <AppLayoutClient>{children}</AppLayoutClient>;
}
