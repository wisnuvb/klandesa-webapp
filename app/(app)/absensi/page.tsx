import AbsensiClient from "./AbsensiClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Absensi Perangkat Desa" };

export default function Page() {
  return <AbsensiClient />;
}
