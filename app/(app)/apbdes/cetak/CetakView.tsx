"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApiGet } from "@/hooks/useApiGet";
import type { ReportTable } from "@/lib/apbdes/tables";

/** Menyembunyikan seluruh aplikasi saat mencetak kecuali lembar laporan. */
const PRINT_CSS = "@page{size:A4 landscape;margin:12mm}@media print{body *{visibility:hidden!important}#laporan-print,#laporan-print *{visibility:visible!important}#laporan-print{position:absolute;left:0;top:0;width:100%}}";

export function CetakView() {
  const sp = useSearchParams();
  const kind = sp.get("kind") ?? "";
  const year = Number(sp.get("year")) || new Date().getFullYear();
  const extra = ["month", "activity", "id", "semester"].flatMap((k) => (sp.get(k) ? [`${k}=${encodeURIComponent(sp.get(k)!)}`] : []));
  const qs = [`kind=${encodeURIComponent(kind)}`, `year=${year}`, ...extra].join("&");
  const { data, loading, error, reload } = useApiGet<{ report: ReportTable }>(`/api/apbdes/laporan?${qs}`);
  const t = data?.report;
  const descCol = t ? t.columns.findIndex((c) => c.label === "Uraian") : -1;

  return (
    <div className="space-y-6">
      <style>{PRINT_CSS}</style>
      <div className="space-y-4 print:hidden">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href="/apbdes">
            <ArrowLeft aria-hidden="true" />
            Kembali ke APBDes &amp; Buku Kas
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="min-h-11" disabled={!t} onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Cetak
          </Button>
          <Button asChild variant="outline" className="min-h-11">
            <a href={`/api/apbdes/laporan?${qs}&format=csv`} download>
              <Download aria-hidden="true" />
              Unduh CSV
            </a>
          </Button>
        </div>
      </div>
      {loading ? <p role="status" className="flex items-center gap-2 text-muted-foreground"><Loader2 aria-hidden="true" className="size-5 animate-spin" />Menyusun laporan…</p> : null}
      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={reload}>Coba lagi</Button>
        </div>
      ) : null}
      {t ? (
        <article id="laporan-print" className="space-y-4 bg-background text-sm">
          <header className="space-y-0.5 text-center">
            <h1 className="text-lg font-bold uppercase">{t.title}</h1>
            {t.subtitle.map((s) => <p key={s}>{s}</p>)}
          </header>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  {t.columns.map((c) => <th key={c.label} scope="col" className={`border px-2 py-1.5 font-semibold ${c.num ? "text-right" : ""}`}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {t.rows.map((r, i) => (
                  <tr key={i} className={r.bold ? "font-semibold" : ""}>
                    {r.cells.map((c, j) => (
                      <td key={j} className={`border px-2 py-1 align-top ${t.columns[j]?.num ? "text-right tabular-nums" : ""}`} style={j === descCol && r.indent ? { paddingLeft: `${0.5 + r.indent * 1.1}rem` } : undefined}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {t.notes.map((n) => <p key={n} className="text-xs text-muted-foreground">{n}</p>)}
          <div className="flex flex-wrap justify-end gap-12 pt-6">
            {t.signers.map((s) => (
              <div key={s.role} className="w-56 text-center">
                <p>{s.role}</p>
                <p className="mt-16 border-t pt-1 font-medium">{s.name ?? "(.......................)"}</p>
              </div>
            ))}
          </div>
        </article>
      ) : null}
    </div>
  );
}
