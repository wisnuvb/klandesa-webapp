"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApiGet } from "@/hooks/useApiGet";
import type { Bundle, BundlePart } from "@/lib/kepatuhan/bundle";
import type { ReportTable } from "@/lib/apbdes/tables";

const css = (landscape: boolean) => `@page{size:A4 ${landscape ? "landscape" : "portrait"};margin:${landscape ? "12" : "18"}mm}@media print{body *{visibility:hidden!important}#bundel-print,#bundel-print *{visibility:visible!important}#bundel-print{position:absolute;left:0;top:0;width:100%}.bundel-part{break-before:page}.bundel-part:first-of-type{break-before:auto}}`;

export function BundelView() {
  const sp = useSearchParams();
  const item = sp.get("item") ?? "";
  const year = Number(sp.get("year")) || new Date().getFullYear();
  const { data, loading, error, reload } = useApiGet<{ bundle: Bundle }>(item ? `/api/kepatuhan/bundel?item=${encodeURIComponent(item)}&year=${year}` : null);
  const b = data?.bundle;
  const printable = b ? b.parts.filter((p) => p.type !== "link") : [];
  const landscape = Boolean(b && !b.parts.some((p) => p.type === "document"));

  return (
    <div className="space-y-6 pb-24">
      <style>{css(landscape)}</style>
      <div className="space-y-4 print:hidden">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href={`/kepatuhan?year=${year}`}>
            <ArrowLeft aria-hidden="true" />
            Kembali ke Kalender Kepatuhan
          </Link>
        </Button>
        {b ? (
          <div className="space-y-3">
            <h1 className="break-words text-xl font-semibold">{b.title}</h1>
            <p className="text-sm text-muted-foreground">Tahun anggaran {b.year}. Halaman ini menggabungkan bahan dari data sistem; cetak dari peramban (pilih &ldquo;Simpan sebagai PDF&rdquo; bila perlu berkas).</p>
            <Button type="button" className="min-h-11" disabled={!printable.length} onClick={() => window.print()}>
              <Printer aria-hidden="true" />
              Cetak semua bagian
            </Button>
            {b.warnings.length ? (
              <ul role="status" className="list-disc space-y-1 rounded-md border border-amber-600/50 bg-amber-50 p-3 pl-8 text-sm text-amber-950">
                {b.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
            {b.parts.some((p) => p.type === "link") ? (
              <section aria-labelledby="bd-link-h" className="space-y-2">
                <h2 id="bd-link-h" className="font-semibold">Dokumen lain yang dicetak dari modulnya</h2>
                <ul className="space-y-1">
                  {b.parts.flatMap((p, i) =>
                    p.type === "link" ? (
                      <li key={i}>
                        <Link href={p.href} className="inline-flex min-h-11 items-center gap-1 break-words underline underline-offset-4">
                          {p.title}
                          <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
                        </Link>
                        <span className="block text-sm text-muted-foreground">{p.note}</span>
                      </li>
                    ) : [],
                  )}
                </ul>
              </section>
            ) : null}
            {b.attachments.length ? (
              <section aria-labelledby="bd-att-h" className="space-y-2">
                <h2 id="bd-att-h" className="font-semibold">Lampiran yang perlu disiapkan sendiri</h2>
                <ul className="list-disc space-y-1 pl-6 text-sm">
                  {b.attachments.map((a) => (
                    <li key={a} className="break-words">{a}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
      {!item ? (
        <div className="space-y-2 rounded-lg border border-dashed p-6">
          <h1 className="text-xl font-semibold">Pilih laporan dulu</h1>
          <p className="max-w-prose text-sm text-muted-foreground">Bahan cetak disusun per laporan wajib. Buka Kalender Kepatuhan, lalu pilih &ldquo;Bahan cetak&rdquo; pada laporan yang ingin dicetak.</p>
        </div>
      ) : null}
      {loading ? (
        <p role="status" className="flex items-center gap-2 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          Menyusun bahan cetak…
        </p>
      ) : null}
      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={reload}>Coba lagi</Button>
        </div>
      ) : null}
      {b && printable.length ? (
        <div id="bundel-print" className="space-y-8 bg-background text-sm">
          {printable.map((p, i) => (
            <Part key={i} part={p} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TableBlock({ t }: { t: ReportTable }) {
  return (
    <div className="space-y-3">
      <header className="space-y-0.5 text-center">
        <h2 className="text-lg font-bold uppercase">{t.title}</h2>
        {t.subtitle.map((s) => (
          <p key={s}>{s}</p>
        ))}
      </header>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr>
              {t.columns.map((c, ci) => (
                <th key={`${ci}-${c.label}`} scope="col" className={`border px-2 py-1.5 font-semibold ${c.num ? "text-right" : ""}`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((r, i) => (
              <tr key={i} className={r.bold ? "font-semibold" : ""}>
                {r.cells.map((c, j) => (
                  <td key={j} className={`border px-2 py-1 align-top ${t.columns[j]?.num ? "text-right tabular-nums" : ""}`} style={j === 0 && r.indent ? { paddingLeft: `${0.5 + r.indent}rem` } : undefined}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {t.notes.map((n) => (
        <p key={n} className="text-xs text-muted-foreground">{n}</p>
      ))}
      <div className="flex flex-wrap justify-end gap-12 pt-6">
        {t.signers.map((s) => (
          <div key={s.role} className="w-56 text-center">
            <p>{s.role}</p>
            <p className="mt-16 border-t pt-1 font-medium">{s.name ?? "(.......................)"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Part({ part }: { part: BundlePart }) {
  if (part.type === "table") return <article className="bundel-part"><TableBlock t={part.table} /></article>;
  if (part.type === "document") {
    return (
      <article className="bundel-part mx-auto max-w-3xl space-y-3 leading-relaxed">
        {part.status === "DRAFT" ? <p className="text-xs text-muted-foreground print:hidden">Ini pratinjau draf; bagian &ldquo;(belum diisi)&rdquo; perlu dilengkapi.</p> : null}
        {part.blocks.map((b, i) => {
          if (b.type === "table") return <TableBlock key={i} t={b.table} />;
          if (b.type === "h1") return <h2 key={i} className="pt-2 text-center text-lg font-bold">{b.text}</h2>;
          if (b.type === "h2") return <h3 key={i} className="pt-4 text-base font-bold">{b.text}</h3>;
          if (b.type === "h3") return <h4 key={i} className="pt-1 font-semibold">{b.text}</h4>;
          if (b.type === "note") return <p key={i} className="text-center text-xs text-muted-foreground">{b.text}</p>;
          return <p key={i} className="whitespace-pre-wrap break-words">{b.text}</p>;
        })}
        <div className="flex justify-end pt-10">
          <div className="w-64 text-center">
            <p>{part.signer.role}</p>
            <p className="mt-16 border-t pt-1 font-medium">{part.signer.name ?? "(.......................)"}</p>
          </div>
        </div>
      </article>
    );
  }
  if (part.type === "text") {
    return (
      <article className="bundel-part space-y-2">
        <h2 className="text-lg font-bold">{part.title}</h2>
        {part.lines.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </article>
    );
  }
  return null;
}
