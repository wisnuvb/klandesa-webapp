"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, Clock, Copy, Loader2, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/components/ui/utils";
import { usePayment } from "@/components/billing/PaymentProvider";
import { formatIdr, type BillingProductType } from "@/lib/billing/catalog";
import { statusBadgeVariant } from "../_lib/statusBadgeVariant";
import { invoiceStatusLabel, methodSummary, productLabel } from "../_lib/invoiceDisplay";
import { useInvoiceHistory, type HistoryInvoice } from "../_hooks/useInvoiceHistory";

const STATUS_TABS = [
  { value: "", label: "Semua" },
  { value: "pending", label: "Menunggu" },
  { value: "paid", label: "Lunas" },
  { value: "expired", label: "Kedaluwarsa" },
  { value: "failed", label: "Gagal" },
] as const;

const ALL_PRODUCTS = "__all__";

const dateTime = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

function invoiceTitle(inv: HistoryInvoice): string {
  const first = inv.items[0]?.name ?? productLabel(inv.productType);
  return inv.items.length > 1 ? `${first} (+${inv.items.length - 1} item)` : first;
}

export default function BillingHistoryPage() {
  const { pay } = usePayment();
  const [status, setStatus] = useState("");
  const [productType, setProductType] = useState("");
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { data, loading, error, reload } = useInvoiceHistory({ status, productType, page });

  const setFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const copy = async (inv: HistoryInvoice) => {
    if (!inv.vaNumber) return;
    try {
      await navigator.clipboard.writeText(inv.vaNumber);
      setCopiedId(inv.id);
      window.setTimeout(() => setCopiedId((cur) => (cur === inv.id ? null : cur)), 2000);
    } catch {
      /* clipboard bisa diblokir; nomor tetap terlihat di layar */
    }
  };

  const openInstructions = (inv: HistoryInvoice) =>
    pay({
      productType: inv.productType as BillingProductType,
      planCode: inv.planCode,
      title: invoiceTitle(inv),
      amount: inv.amount,
      resumeInvoiceId: inv.id,
      onPaid: reload,
    });

  const invoices = data?.invoices ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="space-y-1">
        <Link
          href="/billing"
          className="inline-flex min-h-8 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Kembali ke Langganan & Billing
        </Link>
        <h1 className="text-2xl font-semibold">Riwayat Pembayaran</h1>
        <p className="text-sm text-muted-foreground">
          Semua tagihan desa Anda. Tagihan yang belum dibayar bisa dibuka lagi untuk melihat nomor Virtual Account atau
          kode QRIS.
        </p>
      </div>

      {data && data.pendingCount > 0 && status !== "pending" && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <span className="flex items-center gap-2">
            <Clock className="size-4 shrink-0" aria-hidden="true" />
            Ada {data.pendingCount} tagihan yang menunggu pembayaran.
          </span>
          <Button size="sm" variant="outline" onClick={() => setFilter(() => setStatus("pending"))}>
            Tampilkan
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filter status" className="flex flex-wrap gap-1">
          {STATUS_TABS.map((t) => (
            <Button
              key={t.value || "all"}
              size="sm"
              variant={status === t.value ? "default" : "outline"}
              aria-pressed={status === t.value}
              onClick={() => setFilter(() => setStatus(t.value))}
            >
              {t.label}
            </Button>
          ))}
        </div>
        {data && data.productTypes.length > 1 && (
          <div className="ml-auto w-full sm:w-56">
            <Select
              value={productType || ALL_PRODUCTS}
              onValueChange={(v) => setFilter(() => setProductType(v === ALL_PRODUCTS ? "" : v))}
            >
              <SelectTrigger aria-label="Filter produk" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PRODUCTS}>Semua produk</SelectItem>
                {data.productTypes.map((p) => (
                  <SelectItem key={p} value={p}>
                    {productLabel(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          <Button size="sm" variant="outline" onClick={reload}>
            Coba lagi
          </Button>
        </div>
      )}

      {loading && !data && (
        <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Memuat riwayat…
        </p>
      )}

      {data && invoices.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <ReceiptText className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">{status || productType ? "Tidak ada tagihan yang cocok" : "Belum ada tagihan"}</p>
            <p className="text-sm text-muted-foreground">
              {status || productType
                ? "Coba ubah filter di atas."
                : "Tagihan akan muncul di sini setelah Anda membeli paket atau add-on."}
            </p>
          </CardContent>
        </Card>
      )}

      <ul className={cn("space-y-3", loading && data && "opacity-60 transition-opacity")} aria-busy={loading}>
        {invoices.map((inv) => (
          <li key={inv.id}>
            <Card>
              <CardContent className="space-y-3 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{invoiceTitle(inv)}</p>
                    <p className="mt-0.5 break-all font-mono text-xs text-muted-foreground">{inv.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{formatIdr(inv.amount)}</p>
                    <Badge variant={statusBadgeVariant(inv.status)} className="mt-1">
                      {invoiceStatusLabel(inv.status)}
                    </Badge>
                  </div>
                </div>

                <dl className="grid gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2">
                  <div className="flex gap-2">
                    <dt>Dibuat</dt>
                    <dd className="text-foreground">{dateTime.format(new Date(inv.createdAt))}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt>Metode</dt>
                    <dd className="text-foreground">{methodSummary(inv)}</dd>
                  </div>
                  {inv.status === "paid" && inv.paidAt && (
                    <div className="flex gap-2">
                      <dt>Dibayar</dt>
                      <dd className="text-foreground">{dateTime.format(new Date(inv.paidAt))}</dd>
                    </div>
                  )}
                  {inv.status === "pending" && inv.expiresAt && (
                    <div className="flex gap-2">
                      <dt>Bayar sebelum</dt>
                      <dd className="font-medium text-amber-800">{dateTime.format(new Date(inv.expiresAt))}</dd>
                    </div>
                  )}
                  {inv.status === "expired" && inv.expiresAt && (
                    <div className="flex gap-2">
                      <dt>Berakhir</dt>
                      <dd className="text-foreground">{dateTime.format(new Date(inv.expiresAt))}</dd>
                    </div>
                  )}
                </dl>

                {inv.canResume && inv.vaNumber && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs text-amber-900">Nomor Virtual Account — {methodSummary(inv)}</p>
                      <p className="break-all font-mono text-lg tracking-wider">{inv.vaNumber}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void copy(inv)}
                      aria-label={`Salin nomor virtual account ${inv.invoiceNumber}`}
                    >
                      {copiedId === inv.id ? (
                        <Check className="size-4" aria-hidden="true" />
                      ) : (
                        <Copy className="size-4" aria-hidden="true" />
                      )}
                      {copiedId === inv.id ? "Tersalin" : "Salin"}
                    </Button>
                  </div>
                )}

                {inv.canResume && (
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => openInstructions(inv)}>
                      {inv.qrImageUrl || inv.paymentUrl ? "Buka kode QR / link bayar" : "Lihat cara bayar"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {data && data.pageCount > 1 && (
        <nav aria-label="Halaman riwayat" className="flex items-center justify-between gap-3 pt-1">
          <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">
            Halaman {data.page} dari {data.pageCount} · {data.total} tagihan
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= data.pageCount || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </Button>
        </nav>
      )}
    </div>
  );
}
