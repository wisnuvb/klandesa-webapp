"use client";

import { ArrowLeft, CheckCircle2, Clock, Loader2, Search, ShoppingBag, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FieldError, fieldA11y } from "@/components/app/FormErrorSummary";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import type { OrderEventView, OrderView } from "@/lib/ukm-order/service";

interface ListResponse {
  items: OrderView[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<string, number>;
  statuses: Record<string, string>;
}

const FILTERS: [string, string][] = [
  ["", "Semua"],
  ["DIMINTA", "Diminta"],
  ["DIKONFIRMASI", "Dikonfirmasi"],
  ["SELESAI", "Selesai"],
  ["DIBATALKAN", "Dibatalkan"],
];
const STATUS_ICON: Record<string, typeof Clock> = { DIMINTA: Clock, DIKONFIRMASI: CheckCircle2, SELESAI: CheckCircle2, DIBATALKAN: XCircle };
const ACTION_LABEL: Record<string, string> = { konfirmasi: "Konfirmasi", selesai: "Tandai selesai", batal: "Batalkan" };
const ACTOR: Record<string, string> = { PEMBELI: "Pembeli", PENJUAL: "Penjual", ADMIN: "Admin desa" };
const rupiah = (v: string | number): string => `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(v))}`;
const when = (iso: string): string => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(iso));

export function PesananView() {
  const [status, setStatus] = useState("");
  const [managedOnly, setManagedOnly] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const qs = new URLSearchParams({ page: String(page) });
  if (status) qs.set("status", status);
  if (search) qs.set("search", search);
  if (managedOnly) qs.set("kelolaDesa", "1");
  const list = useApiGet<ListResponse>(`/api/ukm-products/pesanan?${qs}`);
  const d = list.data;
  const pages = d ? Math.max(1, Math.ceil(d.total / d.pageSize)) : 1;

  return (
    <div className="min-w-0 space-y-6 pb-24">
      <header className="space-y-2">
        <Button asChild variant="ghost" className="-ml-3 min-h-11">
          <Link href="/ukm">
            <ArrowLeft aria-hidden="true" /> Kembali ke Produk UKM
          </Link>
        </Button>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <ShoppingBag aria-hidden="true" className="size-6" />
          Pesanan produk UKM
        </h1>
        <p className="max-w-prose text-muted-foreground">
          Warga memesan lewat aplikasi, lalu berhubungan langsung dengan penjual lewat WhatsApp. Di sini admin memantau status pesanan dan membantu bila perlu. Belum ada pembayaran online: pembayaran diselesaikan antara pembeli dan penjual.
        </p>
      </header>

      <div role="group" aria-label="Penyaring status" className="flex flex-wrap gap-2">
        {FILTERS.map(([v, label]) => (
          <Button key={v} type="button" aria-pressed={status === v} variant={status === v ? "default" : "outline"} className="min-h-11" onClick={() => { setStatus(v); setPage(1); }}>
            {label}
            {d ? ` (${v === "" ? Object.values(d.counts).reduce((a, b) => a + b, 0) : (d.counts[v] ?? 0)})` : ""}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <form role="search" className="flex min-w-60 flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); setPage(1); }}>
          <div className="flex-1">
            <label htmlFor="psn-cari" className="sr-only">Cari nama produk</label>
            <Input id="psn-cari" className="h-11" value={searchInput} maxLength={100} onChange={(e) => setSearchInput(e.target.value)} placeholder="Cari nama produk" />
          </div>
          <Button type="submit" variant="outline" className="min-h-11">
            <Search aria-hidden="true" /> Cari
          </Button>
        </form>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" className="size-5" checked={managedOnly} onChange={(e) => { setManagedOnly(e.target.checked); setPage(1); }} />
          Hanya produk yang dikelola desa
        </label>
      </div>

      {list.loading ? (
        <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-5 animate-spin" /> Memuat pesanan…
        </p>
      ) : null}
      {list.error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{list.error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={list.reload}>
            Coba lagi
          </Button>
        </div>
      ) : null}
      {d && d.items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">{status || search || managedOnly ? "Tidak ada pesanan yang cocok." : "Belum ada pesanan."}</p>
          {!status && !search && !managedOnly ? <p className="mt-1 text-sm text-muted-foreground">Pesanan muncul di sini ketika warga memesan produk lewat aplikasi desa.</p> : null}
        </div>
      ) : null}

      <ul className="space-y-3">
        {d?.items.map((o) => {
          const Icon = STATUS_ICON[o.status] ?? Clock;
          return (
            <li key={o.id} className="min-w-0 rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <h2 className="break-words text-base font-semibold">
                    #{o.id} {o.productName}
                  </h2>
                  <p className="text-sm">
                    Jumlah {o.quantity}
                    {o.unit ? ` ${o.unit}` : ""}
                    {o.estimatedTotal ? `, perkiraan ${rupiah(o.estimatedTotal)}` : ""}. Dipesan {when(o.createdAt)}.
                  </p>
                  <p className="break-words text-sm text-muted-foreground">
                    Pembeli: {o.buyer.name}
                    {o.buyer.area ? ` (${o.buyer.area})` : ""}. Penjual: {o.seller.name}
                    {o.seller.managedByVillage ? " (dikelola desa)" : ""}.
                  </p>
                  {o.buyerNote ? <p className="break-words text-sm">Catatan pembeli: {o.buyerNote}</p> : null}
                  {o.sellerNote ? <p className="break-words text-sm">Catatan penjual/admin: {o.sellerNote}</p> : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium">
                    <Icon aria-hidden="true" className="size-4" /> {o.statusLabel}
                  </span>
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpenId(o.id)}>
                    {o.actions.length ? "Tindak lanjuti" : "Lihat riwayat"}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {pages > 1 ? (
        <nav aria-label="Halaman" className="flex items-center justify-between gap-3">
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

      {openId ? <OrderDialog id={openId} onClose={() => setOpenId(null)} onChanged={list.reload} /> : null}
    </div>
  );
}

function OrderDialog({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const detail = useApiGet<{ order: OrderView; events: OrderEventView[] }>(`/api/ukm-products/pesanan/${id}`);
  const [note, setNote] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  const o = detail.data?.order;

  async function act(action: string) {
    const r = await submit(`/api/ukm-products/pesanan/${id}`, "PATCH", { action, note: note || null });
    if (r) {
      setNote("");
      detail.reload();
      onChanged();
    }
  }

  return (
    <Dialog open onOpenChange={(v) => (!v && !busy ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="break-words">{o ? `Pesanan #${o.id}: ${o.productName}` : "Pesanan"}</DialogTitle>
          <DialogDescription>{o ? `Status sekarang: ${o.statusLabel}.` : "Memuat…"}</DialogDescription>
        </DialogHeader>
        {detail.error ? (
          <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {detail.error}
          </p>
        ) : null}
        {o && detail.data ? (
          <div className="min-w-0 space-y-4">
            <ol className="space-y-2 border-l pl-4">
              {detail.data.events.map((e, i) => (
                <li key={i} className="min-w-0 text-sm">
                  <p className="font-medium">
                    {e.toLabel} <span className="font-normal text-muted-foreground">oleh {ACTOR[e.actorKind] ?? e.actorKind}, {when(e.at)}</span>
                  </p>
                  {e.note ? <p className="break-words text-muted-foreground">{e.note}</p> : null}
                </li>
              ))}
            </ol>
            {o.actions.length ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="psn-note">Catatan (wajib untuk membatalkan)</Label>
                  <Textarea {...fieldA11y("psn-note", errors.note)} rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
                  <FieldError id="psn-note" message={errors.note} />
                </div>
                {general ? (
                  <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive outline-none">
                    {general}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {o.actions.map((a) => (
                    <Button key={a} type="button" variant={a === "batal" ? "destructive" : "default"} className="min-h-11" disabled={busy} onClick={() => act(a)}>
                      {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                      {ACTION_LABEL[a] ?? a}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Pesanan ini sudah ditutup.</p>
            )}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" className="min-h-11" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
