import { Suspense } from "react";
import { KepatuhanView } from "./_components/KepatuhanView";

export const metadata = { title: "Kalender Kepatuhan" };

export default function KepatuhanPage() {
  return (
    <Suspense fallback={null}>
      <KepatuhanView />
    </Suspense>
  );
}
