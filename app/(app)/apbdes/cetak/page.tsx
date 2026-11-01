import { Suspense } from "react";
import { CetakView } from "./CetakView";

export const metadata = { title: "Laporan Keuangan Desa" };

export default function CetakLaporanPage() {
  return (
    <Suspense fallback={null}>
      <CetakView />
    </Suspense>
  );
}
