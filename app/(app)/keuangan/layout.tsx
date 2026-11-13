import type { Metadata } from "next";

export const metadata: Metadata = { title: "Keuangan Desa" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
