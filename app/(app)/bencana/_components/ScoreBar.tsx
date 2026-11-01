/** Batang kemajuan dengan angka tertulis. Warna bukan satu-satunya penanda: teks selalu menyertai. */
export function ScoreBar({ label, pct, detail }: { label: string; pct: number; detail?: string }) {
  const v = Math.max(0, Math.min(100, pct));
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span>{label}</span>
        <span className="font-semibold tabular-nums">{v}%</span>
      </div>
      <div role="img" aria-label={`${label}: ${v} persen`} className="h-3 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-emerald-600" style={{ width: `${v}%` }} />
      </div>
      {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}
