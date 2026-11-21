import { Suspense } from "react";
import { AspirasiPublikView } from "@/components/aspirasi-publik/AspirasiPublikView";

export const metadata = { title: "Aspirasi Publik" };

export default function AspirasiPublikPage() {
  return (
    <Suspense fallback={null}>
      <AspirasiPublikView />
    </Suspense>
  );
}
