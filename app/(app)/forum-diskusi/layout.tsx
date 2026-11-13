import type { Metadata } from "next";

export const metadata: Metadata = { title: "Forum Diskusi Warga" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
