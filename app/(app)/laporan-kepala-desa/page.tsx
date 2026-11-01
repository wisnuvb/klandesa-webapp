import { Suspense } from "react";
import { LaporanDesaView } from "./LaporanDesaView";

export const metadata = { title: "Laporan Kepala Desa" };

export default function LaporanKepalaDesaPage() {
  return (
    <Suspense fallback={null}>
      <LaporanDesaView />
    </Suspense>
  );
}
