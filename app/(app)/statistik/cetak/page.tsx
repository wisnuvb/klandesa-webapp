import { Suspense } from "react";
import { CetakView } from "./CetakView";

export const metadata = { title: "Cetak Statistik Kependudukan" };

export default function CetakPage() {
  return (
    <Suspense fallback={null}>
      <CetakView />
    </Suspense>
  );
}
