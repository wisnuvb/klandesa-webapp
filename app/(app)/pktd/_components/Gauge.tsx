/** Batang bagian upah terhadap biaya dengan penanda batas minimal. Selalu disertai teks angka. */
export function Gauge({ label, bps, minPct }: { label: string; bps: number; minPct: number }) {
  const pct = bps / 100;
  const ok = pct >= minPct;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span>{label}</span>
        <span className={`font-semibold tabular-nums ${ok ? "text-emerald-800" : "text-amber-900"}`}>
          {pct.toLocaleString("id-ID", { maximumFractionDigits: 1 })}% {ok ? "(memenuhi)" : `(minimal ${minPct}%)`}
        </span>
      </div>
      <div role="img" aria-label={`${label}: ${pct.toFixed(1)} persen dari biaya; batas minimal ${minPct} persen`} className="relative h-3 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${ok ? "bg-emerald-600" : "bg-amber-500"}`} style={{ width: `${Math.min(100, pct)}%` }} />
        <div aria-hidden="true" className="absolute inset-y-0 w-0.5 bg-foreground/60" style={{ left: `${minPct}%` }} />
      </div>
    </div>
  );
}
