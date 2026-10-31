"use client";

import { useState } from "react";
import { Loader2, Mail, Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiGet } from "@/hooks/useApiGet";
import { DIRECTION_LABEL, NATURE_LABEL, type Direction, type Nature } from "@/lib/tata-kelola/catalog";
import type { RegisterView as Row } from "@/lib/tata-kelola/register";
import { MailFormDialog } from "./MailFormDialog";

interface ListResponse {
  items: Row[];
  total: number;
  page: number;
  pageSize: number;
  counts: { direction: string; year: number; count: number }[];
  can: { create: boolean; update: boolean };
}

const PAGE_SIZE = 25;
const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";
const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function RegisterView() {
  const thisYear = new Date().getFullYear();
  const [direction, setDirection] = useState<Direction>("IN");
  const [year, setYear] = useState(String(thisYear));
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Row | "new" | null>(null);

  const qs = new URLSearchParams({ direction, page: String(page), pageSize: String(PAGE_SIZE) });
  if (year) qs.set("year", year);
  if (search) qs.set("search", search);
  const list = useApiGet<ListResponse>(`/api/tata-kelola/surat?${qs}`);
  const d = list.data;
  const pages = d ? Math.max(1, Math.ceil(d.total / d.pageSize)) : 1;
  const countOf = (dir: Direction) => (d ? d.counts.filter((c) => c.direction === dir && (!year || String(c.year) === year)).reduce((a, c) => a + c.count, 0) : null);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Mail aria-hidden="true" className="size-6" />
            Register Surat
          </h1>
          <p className="max-w-prose text-muted-foreground">Buku agenda surat masuk dan surat keluar. Nomor agenda berurutan setiap tahun dan tidak bisa dihapus, supaya buku tidak berlubang.</p>
        </div>
        {d?.can.create ? (
          <Button type="button" size="lg" className="min-h-11" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" />
            {direction === "IN" ? "Catat surat masuk" : "Catat surat keluar"}
          </Button>
        ) : null}
      </header>

      <div role="tablist" aria-label="Arah surat" className="flex gap-2">
        {(["IN", "OUT"] as Direction[]).map((dir) => (
          <Button key={dir} role="tab" type="button" aria-selected={direction === dir} variant={direction === dir ? "default" : "outline"} className="min-h-11" onClick={() => { setDirection(dir); setPage(1); }}>
            {DIRECTION_LABEL[dir]}
            {countOf(dir) !== null ? ` (${countOf(dir)})` : ""}
          </Button>
        ))}
      </div>

      <section aria-label="Penyaring" className="flex flex-wrap items-end gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); setPage(1); }} className="flex min-w-60 flex-1 gap-2" role="search">
          <div className="flex-1">
            <label htmlFor="sr-cari" className="sr-only">Cari surat</label>
            <Input id="sr-cari" className="h-11" value={searchInput} maxLength={100} onChange={(e) => setSearchInput(e.target.value)} placeholder="Cari asal/tujuan, perihal, atau nomor surat" />
          </div>
          <Button type="submit" variant="outline" className="min-h-11">
            <Search aria-hidden="true" />
            Cari
          </Button>
        </form>
        <div className="w-full sm:w-36">
          <label htmlFor="sr-tahun" className="sr-only">Tahun</label>
          <select id="sr-tahun" className={SELECT_CLASS} value={year} onChange={(e) => { setYear(e.target.value); setPage(1); }}>
            <option value="">Semua tahun</option>
            {Array.from({ length: 15 }, (_, k) => thisYear - k).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </section>

      {list.loading ? (
        <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          Memuat register…
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
          <p className="font-medium">{search ? "Tidak ada surat yang cocok." : `Belum ada ${DIRECTION_LABEL[direction].toLowerCase()} pada ${year || "periode ini"}.`}</p>
        </div>
      ) : null}

      {d && d.items.length > 0 ? (
        <ul className="space-y-3">
          {d.items.map((i) => (
            <li key={i.id} className="rounded-lg border bg-card p-4 text-card-foreground">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded border px-2 py-0.5 font-medium tabular-nums">Agenda {i.agendaLabel}</span>
                    {i.nature !== "BIASA" ? <span className={`rounded border px-2 py-0.5 ${i.nature === "RAHASIA" || i.nature === "SEGERA" ? "border-destructive text-destructive" : ""}`}>{NATURE_LABEL[i.nature as Nature]}</span> : null}
                  </p>
                  <h2 className="break-words font-semibold">{i.subject}</h2>
                  <p className="text-sm text-muted-foreground">
                    {i.direction === "IN" ? "Dari" : "Kepada"} {i.party}
                  </p>
                </div>
                {d.can.update ? (
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => setEditing(i)} aria-label={`Ubah surat agenda ${i.agendaLabel}`}>
                    <Pencil aria-hidden="true" />
                    Ubah
                  </Button>
                ) : null}
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                <div><dt className="inline text-muted-foreground">Nomor surat: </dt><dd className="inline">{i.letterNumber || "-"}</dd></div>
                <div><dt className="inline text-muted-foreground">Tanggal surat: </dt><dd className="inline">{fmt(i.letterDate)}</dd></div>
                <div><dt className="inline text-muted-foreground">{i.direction === "IN" ? "Diterima: " : "Dikirim: "}</dt><dd className="inline">{fmt(i.registeredAt)}</dd></div>
              </dl>
              {i.disposition ? <p className="mt-2 rounded-md bg-muted p-3 text-sm"><strong>Disposisi:</strong> {i.disposition}</p> : null}
              {i.notes ? <p className="mt-2 text-sm text-muted-foreground">{i.notes}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {d && pages > 1 ? (
        <nav aria-label="Halaman" className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" className="min-h-11" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
          <p className="text-sm text-muted-foreground" aria-live="polite">Halaman {page} dari {pages} ({d.total} surat)</p>
          <Button type="button" variant="outline" className="min-h-11" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Berikutnya</Button>
        </nav>
      ) : null}

      {editing ? <MailFormDialog direction={direction} item={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload(); }} /> : null}
    </div>
  );
}
