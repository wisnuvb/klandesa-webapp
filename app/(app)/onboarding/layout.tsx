import type { Metadata } from "next";

export const metadata: Metadata = { title: "Selamat Datang di Klandesa" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
