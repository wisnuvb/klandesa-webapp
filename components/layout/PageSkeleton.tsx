import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fallback generik untuk `loading.tsx` dashboard. Tampil seketika saat berpindah halaman,
 * sebelum data rute dari server tiba. Bentuknya (judul, kartu ringkasan, tabel) mengikuti
 * kerangka kebanyakan halaman agar tidak terjadi lonjakan tata letak saat konten asli muncul.
 */
export default function PageSkeleton() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Memuat halaman…</span>

      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>

      <div className="space-y-3 rounded-xl border p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-24" />
        </div>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
