import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ringkasan Admin Platform" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
