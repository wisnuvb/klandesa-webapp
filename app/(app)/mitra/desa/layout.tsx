import type { Metadata } from "next";

export const metadata: Metadata = { title: "Desa Binaan Mitra" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
