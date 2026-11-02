import { Suspense } from "react";
import { LampidCetakView } from "./LampidCetakView";

export const metadata = { title: "Cetak Laporan LAMPID" };

export default function LampidCetakPage() {
  return (
    <Suspense fallback={null}>
      <LampidCetakView />
    </Suspense>
  );
}
