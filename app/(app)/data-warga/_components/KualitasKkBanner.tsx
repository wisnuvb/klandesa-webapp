"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Pengingat di halaman Data Warga bila ada data KK yang perlu dibereskan.
 * Sengaja diam saat gagal memuat: pengingat ini tidak boleh mengganggu halaman utama.
 */
export function KualitasKkBanner({ refreshKey }: { refreshKey: number }) {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/kependudukan/kualitas?limit=1", { cache: "no-store", signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const counts = j?.counts as Record<string, number> | undefined;
        setTotal(counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0);
      })
      .catch(() => setTotal(0));
    return () => ctrl.abort();
  }, [refreshKey]);

  if (total === 0) return null;

  return (
    <section
      aria-label="Pengingat perbaikan data KK"
      className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50"
    >
      <div className="flex gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <p className="text-sm">
          <span className="font-semibold">{total} data KK perlu dibereskan.</span> Misalnya nomor KK kurang satu angka atau keluarga belum punya Kepala
          Keluarga. Ada saran perbaikannya.
        </p>
      </div>
      <Button asChild className="min-h-11 shrink-0">
        <Link href="/data-warga/kualitas">Lihat dan perbaiki</Link>
      </Button>
    </section>
  );
}
