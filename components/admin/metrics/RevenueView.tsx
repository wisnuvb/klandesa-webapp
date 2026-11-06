"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, Download, Loader2, Search, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatDateTimeWib, formatNumberId, formatPercent, formatRupiah } from "@/lib/platform/metrics/format";
import type { InvoiceListItem } from "@/lib/platform/metrics/invoices";
import { REVENUE_RANGE_LABEL, REVENUE_RANGES, parseRevenueRange, type RevenueRange } from "@/lib/platform/metrics/period";
import type { RevenueReport } from "@/lib/platform/metrics/revenue";
import { RevenueChartSection } from "./RevenueChartSection";
import { DeltaBadge, EmptyState, ErrorState, KpiCard, SectionCard } from "./shared";
import { useAdminData } from "./use-admin-data";

type InvoiceList = { items: InvoiceListItem[]; page: number; pageSize: number; total: number; totalPages: number };

const STATUS_OPTIONS = [
  { value: "all", label: "Semua status" },
  { value: "paid", label: "Lunas" },
  { value: "pending", label: "Menunggu bayar" },
  { value: "expired", label: "Kedaluwarsa" },
  { value: "failed", label: "Gagal" },
] as const;

const RANGE_SHORT: Record<RevenueRange, string> = { "30d": "30 hari", "90d": "90 hari", "12m": "12 bulan", ytd: "Tahun ini" };

function StatusBadge({ status, label }: { status: string; label: string }) {
  const map: Record<string, { Icon: typeof Clock3; cls: string }> = {
    paid: { Icon: CheckCircle2, cls: "text-primary" },
    pending: { Icon: Clock3, cls: "text-chart-4" },
    expired: { Icon: XCircle, cls: "text-muted-foreground" },
    failed: { Icon: XCircle, cls: "text-destructive" },
  };
  const m = map[status] ?? map.expired;
  return (
    <Badge variant="outline" className={`gap-1 ${m.cls}`}>
      <m.Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}

export function RevenueView({ initialStatus = "all", initialRange = "30d" }: { initialStatus?: string; initialRange?: string }) {
  const [range, setRange] = useState<RevenueRange>(parseRevenueRange(initialRange) ?? "30d");
  const [status, setStatus] = useState<string>(STATUS_OPTIONS.some((o) => o.value === initialStatus) ? initialStatus : "all");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [useRange, setUseRange] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const revenue = useAdminData<RevenueReport>(`/api/admin/revenue?range=${range}`);

  const filterParams = useMemo(() => {
    const p = new URLSearchParams();
    if (status !== "all") p.set("status", status);
    if (q) p.set("q", q);
    if (useRange) p.set("range", range);
    return p;
  }, [status, q, useRange, range]);
  const listUrl = useMemo(() => {
    const p = new URLSearchParams(filterParams);
    p.set("page", String(page));
    return `/api/admin/revenue/invoices?${p.toString()}`;
  }, [filterParams, page]);
  const invoices = useAdminData<InvoiceList>(listUrl);

  // Cari otomatis setelah berhenti mengetik (debounce 350 ms); kembali ke halaman 1.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    const id = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(id);
  }, [qInput]);

  const exportCsv = useCallback(async () => {
    setExporting(true);
    setExportMsg(null);
    try {
      const res = await fetch(`/api/admin/revenue/export?${filterParams.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setExportMsg({ ok: false, text: body?.error ?? "Ekspor gagal. Coba lagi." });
        return;
      }
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? "tagihan-klandesa.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportMsg({ ok: true, text: `Berkas ${name} diunduh. Ekspor ini tercatat di jejak audit.` });
    } catch {
      setExportMsg({ ok: false, text: "Tidak bisa terhubung ke server. Coba lagi." });
    } finally {
      setExporting(false);
    }
  }, [filterParams]);

  const r = revenue.data;
  const list = invoices.data;

  return (
    <div className="space-y-4 p-4 md:space-y-6 md:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold md:text-2xl">Pendapatan</h1>
          <p className="text-sm text-muted-foreground">Pembayaran lunas (tunai-masuk), dihitung per tanggal bayar dalam WIB (Asia/Jakarta).</p>
        </div>
        <div className="space-y-1">
          <Label id="range-label" className="text-xs text-muted-foreground">Periode</Label>
          <ToggleGroup
            type="single" variant="outline" value={range} aria-labelledby="range-label" className="flex-wrap"
            onValueChange={(v) => { const next = parseRevenueRange(v); if (next) { setRange(next); setPage(1); } }}
          >
            {REVENUE_RANGES.map((x) => (
              <ToggleGroupItem key={x} value={x} className="min-h-10 px-3" aria-label={REVENUE_RANGE_LABEL[x]}>{RANGE_SHORT[x]}</ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      {revenue.error && !r ? <ErrorState message={revenue.error} onRetry={revenue.reload} /> : null}

      <section aria-label="Ringkasan pendapatan" className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total pendapatan" icon={null} loading={revenue.loading && !r}
          value={r ? formatRupiah(r.total.amount) : null}
          footer={r ? <DeltaBadge change={r.changePct} label="vs periode sebelumnya" /> : null}
        />
        <KpiCard
          title="Tagihan lunas" icon={null} loading={revenue.loading && !r}
          value={r ? formatNumberId(r.total.count) : null}
          footer={r ? <span>Periode sebelumnya: {formatNumberId(r.previous.count)}</span> : null}
        />
        <KpiCard
          title="Rata-rata nilai tagihan" icon={null} loading={revenue.loading && !r}
          value={r ? (r.total.average == null ? "—" : formatRupiah(r.total.average)) : null}
          footer={r ? <span>{r.total.average == null ? "Belum ada tagihan lunas" : "Total ÷ jumlah tagihan lunas"}</span> : null}
        />
        <KpiCard
          title="Belum lunas (dibuat pada periode)" icon={null} loading={revenue.loading && !r}
          value={r ? formatNumberId(r.issues.pending.count + r.issues.expired.count + r.issues.failed.count) : null}
          footer={r ? (
            <span className="flex flex-col gap-0.5">
              <span>Menunggu: {r.issues.pending.count} ({formatRupiah(r.issues.pending.amount)})</span>
              <span>Kedaluwarsa: {r.issues.expired.count} ({formatRupiah(r.issues.expired.amount)})</span>
              <span>Gagal: {r.issues.failed.count} ({formatRupiah(r.issues.failed.amount)})</span>
            </span>
          ) : null}
        />
      </section>

      <SectionCard title={`Pendapatan — ${REVENUE_RANGE_LABEL[range].toLowerCase()}`} description="Setiap batang = jumlah pembayaran lunas pada hari/bulan itu.">
        {r ? <RevenueChartSection report={r} /> : revenue.error ? null : <Skeleton className="h-[300px] w-full" />}
      </SectionCard>

      <SectionCard title="Per produk / paket" description="Hanya tagihan lunas pada periode terpilih.">
        {!r ? (
          revenue.error ? null : <Skeleton className="h-32 w-full" />
        ) : r.byProduct.length === 0 ? (
          <EmptyState title="Belum ada pembayaran" hint="Rincian per produk muncul setelah ada tagihan lunas." />
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Produk</TableHead>
                  <TableHead scope="col">Paket</TableHead>
                  <TableHead scope="col" className="text-right">Tagihan</TableHead>
                  <TableHead scope="col" className="text-right">Pendapatan</TableHead>
                  <TableHead scope="col" className="text-right">Porsi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {r.byProduct.map((p) => (
                  <TableRow key={`${p.productType}:${p.planCode}`}>
                    <TableCell>{p.label}</TableCell>
                    <TableCell className="text-muted-foreground">{p.planCode}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumberId(p.count)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRupiah(p.amount)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPercent(p.share)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Daftar tagihan"
        description="Cari dengan awalan nomor tagihan, kode desa, atau nama desa."
        action={
          <Button type="button" variant="outline" className="min-h-10 shrink-0 gap-1.5" onClick={exportCsv} disabled={exporting}>
            {exporting ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
            Ekspor CSV
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-end">
            <div className="space-y-1">
              <Label htmlFor="inv-q">Cari tagihan</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input id="inv-q" inputMode="search" autoComplete="off" maxLength={60} className="min-h-10 pl-8" placeholder="mis. INV-, kode desa, atau nama desa" value={qInput} onChange={(e) => setQInput(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-status">Status</Label>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger id="inv-status" className="min-h-10 w-full"><SelectValue placeholder="Semua status" /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-h-10 items-center gap-2">
              <Checkbox id="inv-range" className="size-5" checked={useRange} onCheckedChange={(v) => { setUseRange(v === true); setPage(1); }} />
              <Label htmlFor="inv-range" className="text-sm font-normal">Batasi ke periode di atas</Label>
            </div>
          </div>

          <p role="status" aria-live="polite" className={`text-sm ${exportMsg && !exportMsg.ok ? "text-destructive" : "text-muted-foreground"}`}>
            {exportMsg?.text ?? "Ekspor CSV memuat hingga 5.000 tagihan sesuai filter dan dicatat di jejak audit."}
          </p>

          {invoices.error && !list ? (
            <ErrorState message={invoices.error} onRetry={invoices.reload} />
          ) : !list ? (
            <div className="space-y-2" aria-busy="true">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : list.items.length === 0 ? (
            <EmptyState title="Tidak ada tagihan yang cocok" hint="Ubah filter, perluas periode, atau hapus kata pencarian." />
          ) : (
            <>
              {invoices.error ? <ErrorState message={invoices.error} onRetry={invoices.reload} /> : null}
              {/* Layar sempit: kartu; layar lebar: tabel. */}
              <ul className="space-y-2 md:hidden" aria-label="Daftar tagihan">
                {list.items.map((i) => (
                  <li key={i.id} className="space-y-1.5 rounded-lg border p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/admin/desa/${i.villageId}`} className="min-w-0 break-words font-medium underline-offset-4 hover:underline">{i.villageName}</Link>
                      <StatusBadge status={i.status} label={i.statusLabel} />
                    </div>
                    <p className="font-semibold tabular-nums">{formatRupiah(i.amount)}</p>
                    <p className="break-all text-xs text-muted-foreground">{i.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">{i.product} · {i.planCode}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">Dibuat {formatDateTimeWib(i.createdAt)}{i.paidAt ? ` · Dibayar ${formatDateTimeWib(i.paidAt)}` : ""}</p>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto rounded-md border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead scope="col">Nomor</TableHead>
                      <TableHead scope="col">Desa</TableHead>
                      <TableHead scope="col">Produk</TableHead>
                      <TableHead scope="col" className="text-right">Jumlah</TableHead>
                      <TableHead scope="col">Status</TableHead>
                      <TableHead scope="col">Dibuat</TableHead>
                      <TableHead scope="col">Dibayar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.items.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono text-xs">{i.invoiceNumber}</TableCell>
                        <TableCell><Link href={`/admin/desa/${i.villageId}`} className="underline-offset-4 hover:underline">{i.villageName}</Link></TableCell>
                        <TableCell>{i.product} <span className="text-xs text-muted-foreground">· {i.planCode}</span></TableCell>
                        <TableCell className="text-right tabular-nums">{formatRupiah(i.amount)}</TableCell>
                        <TableCell><StatusBadge status={i.status} label={i.statusLabel} /></TableCell>
                        <TableCell className="whitespace-nowrap text-xs tabular-nums">{formatDateTimeWib(i.createdAt)}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs tabular-nums">{i.paidAt ? formatDateTimeWib(i.paidAt) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
                <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
                  {formatNumberId(list.total)} tagihan · halaman {list.page} dari {list.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="min-h-10 gap-1" disabled={list.page <= 1 || invoices.loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    <ChevronLeft className="size-4" aria-hidden="true" />Sebelumnya
                  </Button>
                  <Button type="button" variant="outline" className="min-h-10 gap-1" disabled={list.page >= list.totalPages || invoices.loading} onClick={() => setPage((p) => p + 1)}>
                    Berikutnya<ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
