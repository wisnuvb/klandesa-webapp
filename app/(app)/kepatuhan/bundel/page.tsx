import { Suspense } from "react";
import { BundelView } from "./BundelView";

export const metadata = { title: "Bahan Cetak Laporan" };

export default function BundelPage() {
  return (
    <Suspense fallback={null}>
      <BundelView />
    </Suspense>
  );
}
