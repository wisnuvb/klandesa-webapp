import { Suspense } from "react";
import { LampidView } from "./_components/LampidView";

export const metadata = { title: "Laporan Bulanan LAMPID" };

export default function LampidPage() {
  return (
    <Suspense fallback={null}>
      <LampidView />
    </Suspense>
  );
}
