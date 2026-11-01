/** Batang kemajuan dengan angka tertulis. Warna bukan satu-satunya penanda: teks selalu menyertai. */
export function Bar({ label, pct, detail, tone = "ok" }: { label: string; pct: number | null; detail?: string; tone?: "ok" | "warn" }) {
  const v = pct === null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span>{label}</span>
        <span className="font-semibold tabular-nums">{pct === null ? "-" : `${pct.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`}</span>
      </div>
      <div role="img" aria-label={`${label}: ${pct === null ? "belum dapat dihitung" : `${v.toFixed(1)} persen`}`} className="h-3 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${tone === "warn" ? "bg-amber-500" : "bg-emerald-600"}`} style={{ width: `${v}%` }} />
      </div>
      {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}
