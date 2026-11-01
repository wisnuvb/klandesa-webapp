import { Suspense } from "react";
import { CetakView } from "./CetakView";

export const metadata = { title: "Cetak Laporan Kepala Desa" };

export default function CetakPage() {
  return (
    <Suspense fallback={null}>
      <CetakView />
    </Suspense>
  );
}
