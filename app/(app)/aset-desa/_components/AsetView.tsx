"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, Boxes, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiGet } from "@/hooks/useApiGet";
import { CATEGORIES, CATEGORY_KEYS, DISPOSAL_REASON_LABEL, ORIGIN_LABEL, type DisposalReason, type Origin } from "@/lib/aset-desa/catalog";
import { acquiredLabel, categoryLabel, conditionLabel } from "@/lib/aset-desa/book";
import { DisposeDialog } from "./DisposeDialog";
import { ItemFormDialog } from "./ItemFormDialog";
import { rupiah, SELECT_CLASS, type ItemView, type ListResponse } from "./types";
import { SearchSelect } from "@/components/ui/search-select";

const PAGE_SIZE = 25;

export function AsetView() {
  const [status, setStatus] = useState<"ACTIVE" | "DISPOSED">("ACTIVE");
  const [category, setCategory] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ItemView | "new" | null>(null);
  const [disposing, setDisposing] = useState<ItemView | null>(null);

  const qs = new URLSearchParams({ status, page: String(page), pageSize: String(PAGE_SIZE) });
  if (category) qs.set("category", category);
  if (search) qs.set("search", search);
  const list = useApiGet<ListResponse>(`/api/aset-desa?${qs}`);
  const d = list.data;
  const pages = d ? Math.max(1, Math.ceil(d.total / d.pageSize)) : 1;

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Boxes aria-hidden="true" className="size-6" />
            Aset Desa
          </h1>
          <p className="max-w-prose text-muted-foreground">
            Buku Inventaris Aset Desa sesuai Permendagri 1/2016: catat tanah kas desa, bangunan, kendaraan, peralatan, dan barang milik desa lainnya, lalu cetak buku inventaris tahunan untuk ditandatangani.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/aset-desa/cetak">
              <BookOpen aria-hidden="true" />
              Buku inventaris
            </Link>
          </Button>
          {d?.can.create ? (
            <Button type="button" size="lg" className="min-h-11" onClick={() => setEditing("new")}>
              <Plus aria-hidden="true" />
              Catat barang
            </Button>
          ) : null}
        </div>
      </header>

      {d ? (
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Jenis barang tercatat" value={d.summary.active.toLocaleString("id-ID")} />
          <Stat label="Nilai perolehan (yang diketahui)" value={rupiah(d.summary.totalValue)} />
          <Stat label="Rusak berat" value={String(d.summary.byCondition.RUSAK_BERAT ?? 0)} warn={(d.summary.byCondition.RUSAK_BERAT ?? 0) > 0} hint="Pertimbangkan penghapusan bila tak ekonomis diperbaiki" />
          <Stat label="Sudah dihapus dari buku" value={String(d.summary.disposed)} />
        </dl>
      ) : null}

      <section aria-label="Penyaring" className="space-y-3">
        <div role="tablist" aria-label="Status barang" className="flex gap-2">
          {(
            [
              ["ACTIVE", "Tercatat"],
              ["DISPOSED", "Sudah dihapus"],
            ] as const
          ).map(([v, label]) => (
            <Button key={v} role="tab" type="button" aria-selected={status === v} variant={status === v ? "default" : "outline"} className="min-h-11" onClick={() => { setStatus(v); setPage(1); }}>
              {label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <form onSubmit={applySearch} className="flex min-w-60 flex-1 gap-2" role="search">
            <div className="flex-1">
              <label htmlFor="aset-cari" className="sr-only">
                Cari barang
              </label>
              <Input id="aset-cari" className="h-11" value={searchInput} maxLength={100} onChange={(e) => setSearchInput(e.target.value)} placeholder="Cari nama, kode, identitas, atau lokasi" />
            </div>
            <Button type="submit" variant="outline" className="min-h-11">
              <Search aria-hidden="true" />
              Cari
            </Button>
          </form>
          <div className="w-full sm:w-64">
            <label htmlFor="aset-filter-kategori" className="sr-only">
              Golongan
            </label>
            <SearchSelect id="aset-filter-kategori" className={SELECT_CLASS} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
              <option value="">Semua golongan</option>
              {CATEGORY_KEYS.map((k) => (
                <option key={k} value={k}>
                  {CATEGORIES[k].label}
                  {d?.summary.byCategory[k] ? ` (${d.summary.byCategory[k]})` : ""}
                </option>
              ))}
            </SearchSelect>
          </div>
        </div>
      </section>

      {list.loading ? (
        <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          Memuat buku inventaris…
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
          <p className="font-medium">{search || category ? "Tidak ada barang yang cocok." : status === "ACTIVE" ? "Belum ada barang yang dicatat." : "Belum ada barang yang dihapus dari buku."}</p>
          {!search && !category && status === "ACTIVE" && d.can.create ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">Mulailah dari aset yang paling penting: tanah kas desa, balai desa, dan kendaraan.</p>
              <Button type="button" className="mt-4 min-h-11" onClick={() => setEditing("new")}>
                <Plus aria-hidden="true" />
                Catat barang pertama
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {d && d.items.length > 0 ? (
        <ul className="space-y-3">
          {d.items.map((i) => (
            <li key={i.id} className="rounded-lg border bg-card p-4 text-card-foreground">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <h2 className="break-words font-semibold">{i.name}</h2>
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded border px-2 py-0.5">{categoryLabel(i.category)}</span>
                    {i.strategic ? <span className="rounded border border-amber-400 bg-amber-50 px-2 py-0.5 text-amber-950 dark:bg-amber-950 dark:text-amber-50">Aset strategis</span> : null}
                    <span className={`rounded border px-2 py-0.5 ${i.condition === "RUSAK_BERAT" ? "border-destructive text-destructive" : ""}`}>
                      {i.condition === "RUSAK_BERAT" ? <AlertTriangle aria-hidden="true" className="mr-1 inline size-3.5" /> : null}
                      {conditionLabel(i.condition)}
                    </span>
                  </p>
                </div>
                {i.status === "ACTIVE" && (d.can.update || d.can.dispose) ? (
                  <div className="flex gap-2">
                    {d.can.update ? (
                      <Button type="button" variant="outline" className="min-h-11" onClick={() => setEditing(i)} aria-label={`Ubah ${i.name}`}>
                        <Pencil aria-hidden="true" />
                        Ubah
                      </Button>
                    ) : null}
                    {d.can.dispose ? (
                      <Button type="button" variant="outline" className="min-h-11" onClick={() => setDisposing(i)} aria-label={`Hapus ${i.name} dari buku`}>
                        <Trash2 aria-hidden="true" />
                        Hapus dari buku
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <Detail label="Jumlah" value={`${i.quantity} unit`} />
                <Detail label="Kode barang" value={i.itemCode} />
                <Detail label="Identitas" value={i.identity} />
                <Detail label="Asal usul" value={ORIGIN_LABEL[i.origin as Origin] ?? i.origin} />
                <Detail label="Diperoleh" value={acquiredLabel(i)} />
                <Detail label="Nilai per satuan" value={i.acquisitionValue ? rupiah(i.acquisitionValue) : null} />
                <Detail label="Lokasi" value={i.location} />
                {i.notes ? <Detail label="Keterangan" value={i.notes} /> : null}
              </dl>
              {i.status === "DISPOSED" ? (
                <p className="mt-3 rounded-md bg-muted p-3 text-sm">
                  Dihapus dari buku pada {i.disposedAt ? new Date(`${i.disposedAt}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "-"}.{" "}
                  {i.disposalReason ? DISPOSAL_REASON_LABEL[i.disposalReason as DisposalReason] : ""}. SK: {i.disposalDecree}.{i.disposalNote ? ` ${i.disposalNote}` : ""}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {d && pages > 1 ? (
        <nav aria-label="Halaman" className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" className="min-h-11" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Sebelumnya
          </Button>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Halaman {page} dari {pages} ({d.total.toLocaleString("id-ID")} barang)
          </p>
          <Button type="button" variant="outline" className="min-h-11" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Berikutnya
          </Button>
        </nav>
      ) : null}

      {editing ? (
        <ItemFormDialog
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      ) : null}
      {disposing ? (
        <DisposeDialog
          item={disposing}
          onClose={() => setDisposing(null)}
          onDone={() => {
            setDisposing(null);
            list.reload();
          }}
        />
      ) : null}
    </div>
  );
}

function Stat({ label, value, warn, hint }: { label: string; value: string; warn?: boolean; hint?: string }) {
  return (
    <div className={`rounded-lg border p-4 ${warn ? "border-destructive/60" : ""}`}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
      {warn && hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="inline text-muted-foreground">{label}: </dt>
      <dd className="inline break-words">{value || "-"}</dd>
    </div>
  );
}
