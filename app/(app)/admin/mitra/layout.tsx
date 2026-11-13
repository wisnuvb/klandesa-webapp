import type { Metadata } from "next";

export const metadata: Metadata = { title: "Kelola Mitra" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
