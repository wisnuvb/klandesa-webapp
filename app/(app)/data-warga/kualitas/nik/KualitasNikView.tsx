"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AsyncState } from "@/components/app/patterns";
import { useApiGet } from "@/hooks/useApiGet";
import { NIK_ISSUE_ORDER, type NikFinding, type NikIssueKind } from "@/lib/kependudukan/nik-quality";

interface Response {
  total: number;
  counts: Record<NikIssueKind, number>;
  kinds: { id: NikIssueKind; title: string; help: string }[];
  page: number;
  limit: number;
  matching: number;
  findings: NikFinding[];
}

export function KualitasNikView() {
  const [kind, setKind] = useState<NikIssueKind | null>(null);
  const [page, setPage] = useState(1);
  const res = useApiGet<Response>(`/api/kependudukan/kualitas/nik?page=${page}&limit=25${kind ? `&kind=${kind}` : ""}`);
  const data = res.data;
  const totalFindings = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;
  const meta = (id: NikIssueKind) => data?.kinds.find((k) => k.id === id);
  const pages = data ? Math.max(1, Math.ceil(data.matching / data.limit)) : 1;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link href="/data-warga/kualitas" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Kembali ke Perbaikan Data KK
        </Link>
        <h1 className="text-2xl font-semibold">Periksa NIK</h1>
        <p className="max-w-prose text-muted-foreground">
          NIK menyimpan petunjuk: kode provinsi, tanggal lahir, dan jenis kelamin. Halaman ini mencocokkannya dengan data warga untuk menemukan salah ketik. Temuan hanya{" "}
          <strong>perlu dicek</strong>, belum tentu salah. Tidak ada data yang diubah otomatis.
        </p>
      </header>

      <AsyncState loading={res.loading && !data} error={res.error} onRetry={res.reload} loadingMessage="Memeriksa NIK…" minHeight="40vh">
        {data ? (
          totalFindings === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-10 text-center">
              <CheckCircle2 aria-hidden="true" className="size-10 text-emerald-700 dark:text-emerald-300" />
              <h2 className="text-lg font-semibold">NIK {data.total.toLocaleString("id-ID")} warga aktif tampak sesuai</h2>
              <p className="max-w-md text-sm text-muted-foreground">Tidak ada NIK yang janggal. Periksa lagi setelah mengimpor data baru.</p>
            </div>
          ) : (
            <>
              <p role="status" className="text-sm text-muted-foreground">
                {totalFindings.toLocaleString("id-ID")} temuan dari {data.total.toLocaleString("id-ID")} warga aktif.
              </p>
              <div role="group" aria-label="Saring temuan" className="flex flex-wrap gap-2">
                <Button type="button" variant={kind === null ? "default" : "outline"} className="min-h-11" aria-pressed={kind === null} onClick={() => { setKind(null); setPage(1); }}>
                  Semua ({totalFindings})
                </Button>
                {NIK_ISSUE_ORDER.filter((k) => data.counts[k] > 0).map((k) => (
                  <Button key={k} type="button" variant={kind === k ? "default" : "outline"} className="min-h-11" aria-pressed={kind === k} onClick={() => { setKind(k); setPage(1); }}>
                    {meta(k)?.title} ({data.counts[k]})
                  </Button>
                ))}
              </div>
              <ul className="space-y-2">
                {data.findings.map((f) => (
                  <li key={`${f.kind}-${f.residentId}`} className="rounded-lg border bg-card p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="font-semibold">{f.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        NIK …{f.nikLast4}
                        {f.rt || f.rw ? ` · RT ${f.rt ?? "-"}/RW ${f.rw ?? "-"}` : ""}
                      </p>
                    </div>
                    <p className="mt-1 text-sm font-medium">{meta(f.kind)?.title}</p>
                    <p className="text-sm text-muted-foreground">{meta(f.kind)?.help}</p>
                    {f.relatedIds?.length ? <p className="mt-1 text-sm text-muted-foreground">Mirip dengan {f.relatedIds.length} warga lain di data desa ini.</p> : null}
                  </li>
                ))}
              </ul>
              {pages > 1 ? (
                <nav aria-label="Halaman temuan" className="flex items-center justify-between gap-3">
                  <Button type="button" variant="outline" className="min-h-11" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Sebelumnya
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Halaman {page} dari {pages}
                  </span>
                  <Button type="button" variant="outline" className="min-h-11" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                    Berikutnya
                  </Button>
                </nav>
              ) : null}
            </>
          )
        ) : null}
      </AsyncState>
    </div>
  );
}
