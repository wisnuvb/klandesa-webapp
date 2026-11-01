"use client";

import { useState } from "react";
import { Ban, Gavel, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError, FormErrorSummary, fieldA11y } from "@/components/app/FormErrorSummary";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { LEGAL_TYPE_LABEL, LEGAL_TYPES, type LegalType } from "@/lib/tata-kelola/catalog";
import type { LegalView } from "@/lib/tata-kelola/legal";
import { LegalFormDialog, SELECT_CLASS } from "./LegalFormDialog";
import { SearchSelect } from "@/components/ui/search-select";

interface ListResponse {
  items: LegalView[];
  total: number;
  page: number;
  pageSize: number;
  inForce: Record<string, number>;
  can: { create: boolean; update: boolean; delete: boolean };
}

const PAGE_SIZE = 25;
const fmt = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "-");

export function ProdukHukumView() {
  const thisYear = new Date().getFullYear();
  const [type, setType] = useState("");
  const [status, setStatus] = useState<"" | "BERLAKU" | "DICABUT">("");
  const [year, setYear] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<LegalView | "new" | null>(null);
  const [revoking, setRevoking] = useState<LegalView | null>(null);
  const [deleting, setDeleting] = useState<LegalView | null>(null);

  const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (type) qs.set("type", type);
  if (status) qs.set("status", status);
  if (year) qs.set("year", year);
  if (search) qs.set("search", search);
  const list = useApiGet<ListResponse>(`/api/tata-kelola/produk-hukum?${qs}`);
  const d = list.data;
  const pages = d ? Math.max(1, Math.ceil(d.total / d.pageSize)) : 1;
  const reset = () => setPage(1);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Gavel aria-hidden="true" className="size-6" />
            Produk Hukum Desa
          </h1>
          <p className="max-w-prose text-muted-foreground">Register Peraturan Desa, Peraturan Kepala Desa, Peraturan Bersama, dan Keputusan Kepala Desa: nomor, tanggal, dan status berlakunya.</p>
        </div>
        {d?.can.create ? (
          <Button type="button" size="lg" className="min-h-11" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" />
            Catat produk hukum
          </Button>
        ) : null}
      </header>

      {d ? (
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(["PERDES", "PERKADES", "PERBER", "KEPKADES"] as LegalType[]).map((t) => (
            <div key={t} className="rounded-lg border p-4">
              <dt className="text-sm text-muted-foreground">{LEGAL_TYPE_LABEL[t]} (berlaku)</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{d.inForce[t] ?? 0}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      <section aria-label="Penyaring" className="flex flex-wrap items-end gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); reset(); }} className="flex min-w-60 flex-1 gap-2" role="search">
          <div className="flex-1">
            <label htmlFor="ph-cari" className="sr-only">Cari produk hukum</label>
            <Input id="ph-cari" className="h-11" value={searchInput} maxLength={100} onChange={(e) => setSearchInput(e.target.value)} placeholder="Cari nomor atau judul" />
          </div>
          <Button type="submit" variant="outline" className="min-h-11">
            <Search aria-hidden="true" />
            Cari
          </Button>
        </form>
        <div className="w-full sm:w-56">
          <label htmlFor="ph-f-type" className="sr-only">Jenis</label>
          <SearchSelect id="ph-f-type" className={SELECT_CLASS} value={type} onChange={(e) => { setType(e.target.value); reset(); }}>
            <option value="">Semua jenis</option>
            {LEGAL_TYPES.map((t) => <option key={t} value={t}>{LEGAL_TYPE_LABEL[t]}</option>)}
          </SearchSelect>
        </div>
        <div className="w-full sm:w-40">
          <label htmlFor="ph-f-status" className="sr-only">Status</label>
          <SearchSelect id="ph-f-status" className={SELECT_CLASS} value={status} onChange={(e) => { setStatus(e.target.value as typeof status); reset(); }}>
            <option value="">Semua status</option>
            <option value="BERLAKU">Berlaku</option>
            <option value="DICABUT">Dicabut</option>
          </SearchSelect>
        </div>
        <div className="w-full sm:w-32">
          <label htmlFor="ph-f-year" className="sr-only">Tahun</label>
          <SearchSelect id="ph-f-year" className={SELECT_CLASS} value={year} onChange={(e) => { setYear(e.target.value); reset(); }}>
            <option value="">Semua tahun</option>
            {Array.from({ length: 15 }, (_, k) => thisYear - k).map((y) => <option key={y} value={y}>{y}</option>)}
          </SearchSelect>
        </div>
      </section>

      {list.loading ? (
        <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          Memuat produk hukum…
        </p>
      ) : null}
      {list.error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{list.error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={list.reload}>Coba lagi</Button>
        </div>
      ) : null}

      {d && d.items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">{search || type || status || year ? "Tidak ada produk hukum yang cocok." : "Belum ada produk hukum yang dicatat."}</p>
        </div>
      ) : null}

      {d && d.items.length > 0 ? (
        <ul className="space-y-3">
          {d.items.map((i) => (
            <li key={i.id} className="rounded-lg border bg-card p-4 text-card-foreground">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {LEGAL_TYPE_LABEL[i.type as LegalType] ?? i.type} Nomor {i.number}
                  </p>
                  <h2 className="break-words font-semibold">{i.title}</h2>
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className={`rounded border px-2 py-0.5 ${i.status === "DICABUT" ? "border-destructive text-destructive" : ""}`}>
                      {i.status === "DICABUT" ? <Ban aria-hidden="true" className="mr-1 inline size-3.5" /> : null}
                      {i.status === "BERLAKU" ? "Berlaku" : "Dicabut"}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {d.can.update ? (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setEditing(i)} aria-label={`Ubah ${i.title}`}>
                      <Pencil aria-hidden="true" />
                      Ubah
                    </Button>
                  ) : null}
                  {d.can.update && i.status === "BERLAKU" ? (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setRevoking(i)} aria-label={`Cabut ${i.title}`}>
                      <Ban aria-hidden="true" />
                      Cabut
                    </Button>
                  ) : null}
                  {d.can.delete ? (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setDeleting(i)} aria-label={`Hapus catatan ${i.title}`}>
                      <Trash2 aria-hidden="true" />
                      Hapus
                    </Button>
                  ) : null}
                </div>
              </div>
              {i.summary ? <p className="mt-2 text-sm">{i.summary}</p> : null}
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                <div><dt className="inline text-muted-foreground">Ditetapkan: </dt><dd className="inline">{fmt(i.enactedAt)}</dd></div>
                <div><dt className="inline text-muted-foreground">Diundangkan: </dt><dd className="inline">{fmt(i.promulgatedAt)}</dd></div>
                <div><dt className="inline text-muted-foreground">Disampaikan ke Bupati: </dt><dd className="inline">{fmt(i.submittedAt)}</dd></div>
              </dl>
              {i.status === "DICABUT" ? (
                <p className="mt-3 rounded-md bg-muted p-3 text-sm">
                  Dicabut pada {fmt(i.revokedAt)}
                  {i.revokedByRef ? ` dengan ${i.revokedByRef}` : ""}.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {d && pages > 1 ? (
        <nav aria-label="Halaman" className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" className="min-h-11" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
          <p className="text-sm text-muted-foreground" aria-live="polite">Halaman {page} dari {pages} ({d.total} produk hukum)</p>
          <Button type="button" variant="outline" className="min-h-11" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Berikutnya</Button>
        </nav>
      ) : null}

      {editing ? <LegalFormDialog item={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload(); }} /> : null}
      {revoking ? <RevokeDialog item={revoking} onClose={() => setRevoking(null)} onDone={() => { setRevoking(null); list.reload(); }} /> : null}
      {deleting ? <DeleteDialog item={deleting} onClose={() => setDeleting(null)} onDone={() => { setDeleting(null); list.reload(); }} /> : null}
    </div>
  );
}

function RevokeDialog({ item, onClose, onDone }: { item: LegalView; onClose: () => void; onDone: () => void }) {
  const [revokedAt, setRevokedAt] = useState("");
  const [ref, setRef] = useState("");
  const { busy, errors, general, summaryRef, submit } = useFormSubmit();
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cabut produk hukum</DialogTitle>
          <DialogDescription>
            {LEGAL_TYPE_LABEL[item.type as LegalType]} Nomor {item.number}. Produk yang dicabut tetap tercatat sebagai riwayat dan tidak dapat diberlakukan kembali; terbitkan produk baru bila perlu.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={async (e) => { e.preventDefault(); if (await submit(`/api/tata-kelola/produk-hukum/${item.id}/pencabutan`, "POST", { revokedAt, revokedByRef: ref })) onDone(); }} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="cb-date">Tanggal pencabutan *</Label>
            <Input {...fieldA11y("cb-date", errors.revokedAt)} className="h-11" type="date" value={revokedAt} onChange={(e) => setRevokedAt(e.target.value)} />
            <FieldError id="cb-date" message={errors.revokedAt} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cb-ref">Dicabut dengan</Label>
            <Input {...fieldA11y("cb-ref", errors.revokedByRef)} className="h-11" value={ref} maxLength={200} onChange={(e) => setRef(e.target.value)} placeholder="Contoh: Perdes Nomor 9 Tahun 2026" />
            <FieldError id="cb-ref" message={errors.revokedByRef} />
          </div>
          <FormErrorSummary innerRef={summaryRef} errors={errors} general={general} labels={{ revokedAt: "Tanggal pencabutan", revokedByRef: "Dicabut dengan" }} />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
            <Button type="submit" variant="destructive" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {busy ? "Memproses…" : "Cabut"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ item, onClose, onDone }: { item: LegalView; onClose: () => void; onDone: () => void }) {
  const { busy, general, summaryRef, submit } = useFormSubmit();
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hapus catatan?</DialogTitle>
          <DialogDescription>
            Catatan &ldquo;{item.title}&rdquo; dihapus dari register. Gunakan hanya untuk salah catat; untuk produk yang tidak berlaku lagi, pilih &ldquo;Cabut&rdquo;.
          </DialogDescription>
        </DialogHeader>
        <FormErrorSummary innerRef={summaryRef} errors={{}} general={general} labels={{}} />
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
          <Button type="button" variant="destructive" className="min-h-11" disabled={busy} onClick={async () => { if (await submit(`/api/tata-kelola/produk-hukum/${item.id}`, "DELETE", undefined, "Gagal menghapus. Coba lagi.")) onDone(); }}>
            {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
            Hapus catatan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
