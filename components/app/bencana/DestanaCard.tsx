"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useApiGet } from "@/hooks/useApiGet";

interface Card {
  counts: { hazards: number; activeVolunteers: number; adoptedPlans: number };
  readiness: { score: { done: number; total: number; pct: number }; currentLevel: { label: string } | null };
  incidents: { active: number };
}

/**
 * Kartu "Desa Tangguh Bencana" untuk halaman Dana Desa: fokus penggunaan "Penguatan Desa Berketahanan Iklim dan Tangguh Bencana"
 * (Permendesa PDT 16/2025, Lampiran II.B). Mandiri: memuat ringkasan dari /api/bencana dan tidak tampil bila pengguna tidak
 * berhak atau gagal memuat, sehingga tidak mengganggu halaman induk.
 */
export function DestanaCard() {
  const { data, error } = useApiGet<Card>("/api/bencana");
  if (error || !data) return null;
  const pct = Math.max(0, Math.min(100, data.readiness.score.pct));
  return (
    <section aria-labelledby="dd-destana-h" className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id="dd-destana-h" className="text-lg font-semibold">
            Desa Tangguh Bencana
          </h2>
          <p className="text-sm text-muted-foreground">Kesiapan desa untuk fokus Dana Desa “Penguatan Desa Berketahanan Iklim dan Tangguh Bencana”.</p>
        </div>
        <Link href="/bencana" className="inline-flex min-h-11 items-center gap-0.5 text-sm underline underline-offset-4">
          Buka Kebencanaan
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span>Aktivitas Destana selesai</span>
          <span className="font-semibold tabular-nums">{pct}%</span>
        </div>
        <div role="img" aria-label={`Aktivitas Destana selesai: ${pct} persen`} className="h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-emerald-600" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">
          {data.readiness.score.done} dari {data.readiness.score.total} aktivitas (Peraturan BNPB 7/2025 Pasal 8). Tingkat ketangguhan resmi: {data.readiness.currentLevel ? data.readiness.currentLevel.label : "belum dicatat"}.
        </p>
      </div>
      <p className="text-sm">
        {data.counts.hazards} ancaman tercatat · {data.counts.activeVolunteers} relawan aktif · {data.counts.adoptedPlans} dokumen rencana ditetapkan · {data.incidents.active} kejadian masih berjalan
      </p>
    </section>
  );
}
