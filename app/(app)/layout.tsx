import { AppLayoutClient } from "./AppLayoutClient";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return <AppLayoutClient>{children}</AppLayoutClient>;
}
