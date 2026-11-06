"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RevenueView } from "@/components/admin/metrics/RevenueView";
import PageSkeleton from "@/components/layout/PageSkeleton";

function Inner() {
  const sp = useSearchParams();
  return <RevenueView initialStatus={sp.get("status") ?? "all"} initialRange={sp.get("range") ?? "30d"} />;
}

/** Halaman Pendapatan: periode, grafik, tabel tagihan terfilter, ekspor CSV. Tautan: /admin/pendapatan?status=pending&range=90d */
export default function AdminRevenuePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Inner />
    </Suspense>
  );
}
