import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pusat Akun Admin" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
