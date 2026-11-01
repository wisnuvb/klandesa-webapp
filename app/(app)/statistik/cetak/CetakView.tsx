"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApiGet } from "@/hooks/useApiGet";
import { buildStatisticTables, buildSummaryRows, formatLongDate, SOURCE_NOTE } from "@/lib/statistics/export";
import type { StatisticsData } from "@/lib/statistics/types";

const PRINT_CSS =
  "@page{size:A4 portrait;margin:15mm}@media print{body *{visibility:hidden!important}#stat-print,#stat-print *{visibility:visible!important}#stat-print{position:absolute;left:0;top:0;width:100%}}";

const fmt = (n: string | number) => (typeof n === "number" ? n.toLocaleString("id-ID") : n);

export function CetakView() {
  const { data: session } = useSession();
  const villageName = session?.user?.village?.name || session?.user?.villageCode || "";
  const { data: body, loading, error, reload } = useApiGet<{ data: StatisticsData }>("/api/statistics");
  const data = body?.data;
  const generated = data ? new Date(data.dihitungPada) : null;

  return (
    <div className="space-y-6">
      <style>{PRINT_CSS}</style>
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href="/statistik">
            <ArrowLeft aria-hidden="true" />
            Kembali ke Statistik
          </Link>
        </Button>
        <Button type="button" className="min-h-11" disabled={!data} onClick={() => window.print()}>
          <Printer aria-hidden="true" />
          Cetak / Simpan PDF
        </Button>
        <p className="text-sm text-muted-foreground">Pilih &ldquo;Simpan sebagai PDF&rdquo; di dialog cetak untuk mendapatkan berkas PDF.</p>
      </div>

      {loading ? (
        <p role="status" className="flex items-center gap-2 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          Menyusun rekap…
        </p>
      ) : null}

      {error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={reload}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      {data && generated ? (
        <article id="stat-print" className="mx-auto max-w-3xl space-y-5 bg-background text-sm leading-relaxed">
          <header className="space-y-1 text-center">
            <h1 className="text-lg font-bold uppercase">Rekapitulasi Statistik Kependudukan</h1>
            {villageName ? <p className="font-semibold">{villageName}</p> : null}
            <p className="text-xs text-muted-foreground">Per {formatLongDate(generated)}</p>
          </header>

          <section className="break-inside-avoid">
            <table className="w-full table-fixed border-collapse text-left text-xs">
              <caption className="pb-1 text-left font-semibold">Ringkasan</caption>
              <colgroup>
                <col style={{ width: "50%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col" className="border px-2 py-1">Keterangan</th>
                  <th scope="col" className="border px-2 py-1 text-right">Jumlah</th>
                  <th scope="col" className="border px-2 py-1 text-right">Persen (%)</th>
                </tr>
              </thead>
              <tbody>
                {buildSummaryRows(data).map((r) => (
                  <tr key={String(r[0])}>
                    <td className="border px-2 py-1">{r[0]}</td>
                    <td className="border px-2 py-1 text-right tabular-nums">{fmt(r[1])}</td>
                    <td className="border px-2 py-1 text-right tabular-nums">{fmt(r[2])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {buildStatisticTables(data).map((t) => (
            <section key={t.sheet} className="break-inside-avoid">
              <table className="w-full table-fixed border-collapse text-left text-xs">
                <caption className="pb-1 text-left font-semibold">{t.title}</caption>
                <colgroup>
                  <col style={{ width: t.columns.length <= 3 ? "50%" : "30%" }} />
                </colgroup>
                <thead>
                  <tr>
                    {t.columns.map((c, i) => (
                      <th key={c} scope="col" className={`border px-2 py-1 ${t.numeric.includes(i) ? "text-right" : ""}`}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.rows.map((r, ri) => (
                    <tr key={ri}>
                      {r.map((c, ci) => (
                        <td key={ci} className={`border px-2 py-1 ${t.numeric.includes(ci) ? "text-right tabular-nums" : ""}`}>
                          {fmt(c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {t.total ? (
                    <tr className="font-semibold">
                      {t.total.map((c, ci) => (
                        <td key={ci} className={`border bg-muted/40 px-2 py-1 ${t.numeric.includes(ci) ? "text-right tabular-nums" : ""}`}>
                          {fmt(c)}
                        </td>
                      ))}
                    </tr>
                  ) : null}
                </tbody>
              </table>
              {t.note ? <p className="pt-1 text-xs text-muted-foreground">{t.note}</p> : null}
            </section>
          ))}

          <footer className="border-t pt-2 text-xs text-muted-foreground">
            <p>{SOURCE_NOTE}</p>
            <p>Dicetak dari KlanDesa pada {formatLongDate(new Date())}.</p>
          </footer>
        </article>
      ) : null}
    </div>
  );
}
