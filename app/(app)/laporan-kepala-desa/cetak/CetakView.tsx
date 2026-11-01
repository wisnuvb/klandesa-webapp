"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApiGet } from "@/hooks/useApiGet";
import type { ReportDocument } from "@/lib/laporan-desa/document";

const PRINT_CSS = "@page{size:A4 portrait;margin:18mm}@media print{body *{visibility:hidden!important}#lapkades-print,#lapkades-print *{visibility:visible!important}#lapkades-print{position:absolute;left:0;top:0;width:100%}}";

export function CetakView() {
  const sp = useSearchParams();
  const kind = sp.get("kind") ?? "";
  const year = Number(sp.get("year")) || new Date().getFullYear() - 1;
  const { data, loading, error, reload } = useApiGet<{ document: ReportDocument & { status: string } }>(`/api/laporan-desa/dokumen?kind=${encodeURIComponent(kind)}&year=${year}`);
  const doc = data?.document;
  return (
    <div className="space-y-6">
      <style>{PRINT_CSS}</style>
      <div className="space-y-4 print:hidden">
        <Button asChild variant="ghost" className="min-h-11"><Link href="/laporan-kepala-desa"><ArrowLeft aria-hidden="true" />Kembali ke Laporan Kepala Desa</Link></Button>
        <Button type="button" className="min-h-11" disabled={!doc} onClick={() => window.print()}><Printer aria-hidden="true" />Cetak</Button>
        {doc && doc.status === "DRAFT" ? <p role="status" className="text-sm text-muted-foreground">Ini pratinjau draf. Bagian bertanda &ldquo;(belum diisi)&rdquo; perlu dilengkapi sebelum diserahkan.</p> : null}
      </div>
      {loading ? <p role="status" className="flex items-center gap-2 text-muted-foreground"><Loader2 aria-hidden="true" className="size-5 animate-spin" />Menyusun dokumen…</p> : null}
      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={reload}>Coba lagi</Button>
        </div>
      ) : null}
      {doc ? (
        <article id="lapkades-print" className="mx-auto max-w-3xl space-y-3 bg-background text-sm leading-relaxed">
          {doc.blocks.map((b, i) => {
            if (b.type !== "table") {
              if (b.type === "h1") return <h1 key={i} className="pt-2 text-center text-lg font-bold">{b.text}</h1>;
              if (b.type === "h2") return <h2 key={i} className="pt-4 text-base font-bold">{b.text}</h2>;
              if (b.type === "h3") return <h3 key={i} className="pt-1 font-semibold">{b.text}</h3>;
              if (b.type === "note") return <p key={i} className="text-center text-xs text-muted-foreground">{b.text}</p>;
              return <p key={i} className="whitespace-pre-wrap break-words">{b.text}</p>;
            }
            return (
              <div key={i} className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <caption className="pb-1 text-left font-semibold">{b.table.title}</caption>
                  <thead><tr>{b.table.columns.map((c) => <th key={c.label} scope="col" className={`border px-2 py-1 ${c.num ? "text-right" : ""}`}>{c.label}</th>)}</tr></thead>
                  <tbody>
                    {b.table.rows.map((r, ri) => (
                      <tr key={ri} className={r.bold ? "font-semibold" : ""}>
                        {r.cells.map((c, ci) => <td key={ci} className={`border px-2 py-1 align-top ${b.table.columns[ci]?.num ? "text-right tabular-nums" : ""}`} style={ci === 0 && r.indent ? { paddingLeft: `${0.5 + r.indent * 1}rem` } : undefined}>{c}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {b.table.notes.map((n) => <p key={n} className="pt-1 text-xs text-muted-foreground">{n}</p>)}
              </div>
            );
          })}
          <div className="flex justify-end pt-10">
            <div className="w-64 text-center">
              <p>{doc.signer.role}</p>
              <p className="mt-16 border-t pt-1 font-medium">{doc.signer.name ?? "(.......................)"}</p>
            </div>
          </div>
        </article>
      ) : null}
    </div>
  );
}
