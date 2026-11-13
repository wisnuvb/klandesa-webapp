import type { Metadata } from "next";

export const metadata: Metadata = { title: "Layanan Website Desa" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
