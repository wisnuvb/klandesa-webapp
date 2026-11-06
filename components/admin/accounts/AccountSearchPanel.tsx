"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Lock, RefreshCw, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccountDetailSheet } from "./AccountDetailSheet";
import { VillageFilter } from "./VillageFilter";
import { apiJson, fmtDateTime, roleLabel, type AccountRow, type SearchResult, type VillageRef } from "./shared";

type Filters = { q: string; type: string; status: string; village: VillageRef | null };
const EMPTY: Filters = { q: "", type: "all", status: "", village: null };

function StatusBadge({ row }: { row: AccountRow }) {
  if (row.status === "inactive") return <Badge variant="destructive">{row.kind === "staff" ? "Nonaktif" : "Dibekukan"}</Badge>;
  if (row.status === "pending") return <Badge variant="secondary">Menunggu persetujuan</Badge>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Aktif</Badge>
      {row.kind === "citizen" && row.locked ? (
        <Badge variant="secondary"><Lock aria-hidden="true" /> Terkunci</Badge>
      ) : null}
    </span>
  );
}

const kindLabel = (r: AccountRow) => (r.kind === "staff" ? "Pengguna desa" : "Warga mobile");
const subtitle = (r: AccountRow) => (r.kind === "staff" ? r.emailMasked : `@${r.username}`);

export function AccountSearchPanel() {
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ kind: "staff" | "citizen"; id: number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const qId = useId();
  const typeId = useId();
  const statusId = useId();
  const villageId = useId();

  const load = useCallback(async (f: Filters, p: number, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    const sp = new URLSearchParams();
    if (f.q.trim()) sp.set("q", f.q.trim());
    if (f.type !== "all") sp.set("type", f.type);
    if (f.status) sp.set("status", f.status);
    if (f.village) sp.set("villageId", String(f.village.id));
    sp.set("page", String(p));
    try {
      setResult(await apiJson<SearchResult>(`/api/admin/accounts?${sp.toString()}`, { signal }));
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Gagal memuat akun.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(applied, page, ctrl.signal);
    return () => ctrl.abort();
  }, [applied, page, load]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setApplied({ ...draft });
  }

  function reset() {
    setDraft(EMPTY);
    setPage(1);
    setApplied(EMPTY);
  }

  function open(row: AccountRow, trigger: HTMLElement) {
    lastTrigger.current = trigger;
    setSelected({ kind: row.kind, id: row.id });
    setSheetOpen(true);
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={submit} role="search" aria-label="Cari akun" className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1.5fr_auto]">
            <div className="space-y-1.5 md:col-span-2 xl:col-span-1">
              <Label htmlFor={qId}>Cari akun</Label>
              <Input id={qId} type="search" className="min-h-10" value={draft.q} maxLength={100} placeholder="Nama, email, username, atau kode desa" onChange={(e) => setDraft({ ...draft, q: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={typeId}>Jenis akun</Label>
              <SearchSelect id={typeId} className="w-full" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                <option value="all">Semua jenis</option>
                <option value="staff">Pengguna desa</option>
                <option value="citizen">Warga mobile</option>
              </SearchSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={statusId}>Status</Label>
              <SearchSelect id={statusId} className="w-full" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                <option value="">Semua status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif / dibekukan</option>
                <option value="pending">Menunggu persetujuan (warga)</option>
                <option value="locked">Terkunci (warga)</option>
              </SearchSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={villageId}>Desa</Label>
              <VillageFilter id={villageId} value={draft.village} onChange={(v) => setDraft({ ...draft, village: v })} />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" className="min-h-10 flex-1"><Search aria-hidden="true" className="h-4 w-4" /> Cari</Button>
              <Button type="button" variant="outline" className="min-h-10" onClick={reset}>Atur ulang</Button>
            </div>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">Email dan data pribadi ditampilkan tersamar. Setiap tindakan pada akun memerlukan konfirmasi sandi Anda dan tercatat di jejak audit.</p>
        </CardContent>
      </Card>

      <div aria-live="polite" className="text-sm text-muted-foreground tabular-nums" role="status">
        {loading ? "Memuat…" : result ? `${result.total.toLocaleString("id-ID")} akun ditemukan` : ""}
      </div>

      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle aria-hidden="true" className="h-4 w-4" />
          <span className="min-w-0 flex-1">{error}</span>
          <Button type="button" size="sm" variant="outline" className="min-h-10" onClick={() => void load(applied, page)}>
            <RefreshCw aria-hidden="true" className="h-4 w-4" /> Coba lagi
          </Button>
        </div>
      ) : null}

      {loading && !result ? (
        <div className="space-y-2" aria-busy="true" aria-label="Memuat daftar akun">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : null}

      {result && result.rows.length === 0 && !error ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
          <Users aria-hidden="true" className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Tidak ada akun yang cocok</p>
          <p className="text-sm text-muted-foreground">Coba kata kunci lain (pencarian memakai awalan nama, email, username, atau kode desa) atau longgarkan filter.</p>
        </div>
      ) : null}

      {result && result.rows.length > 0 ? (
        <>
          {/* Layar lebar: tabel */}
          <div className={`hidden rounded-lg border md:block ${loading ? "opacity-60" : ""}`}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Akun</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Desa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Masuk terakhir</TableHead>
                  <TableHead className="w-24 text-right"><span className="sr-only">Aksi</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((r) => (
                  <TableRow key={`${r.kind}-${r.id}`}>
                    <TableCell className="max-w-[16rem]">
                      <div className="truncate font-medium">{r.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{subtitle(r)}{r.kind === "staff" ? ` · ${roleLabel(r.role)}` : ""}</div>
                    </TableCell>
                    <TableCell>{kindLabel(r)}</TableCell>
                    <TableCell className="max-w-[14rem]">
                      <div className="truncate">{r.village.name}</div>
                      <div className="text-xs tabular-nums text-muted-foreground">{r.village.code}</div>
                    </TableCell>
                    <TableCell><StatusBadge row={r} /></TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">{fmtDateTime(r.lastLogin)}</TableCell>
                    <TableCell className="text-right">
                      <Button type="button" size="sm" variant="outline" className="min-h-10" onClick={(e) => open(r, e.currentTarget)} aria-label={`Buka detail ${r.name}`}>Detail</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Layar sempit: kartu */}
          <ul className={`space-y-2 md:hidden ${loading ? "opacity-60" : ""}`}>
            {result.rows.map((r) => (
              <li key={`${r.kind}-${r.id}`}>
                <button
                  type="button"
                  onClick={(e) => open(r, e.currentTarget)}
                  className="w-full min-h-14 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Buka detail ${r.name}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 break-words font-medium">{r.name}</span>
                    <StatusBadge row={r} />
                  </div>
                  <div className="mt-0.5 break-all text-xs text-muted-foreground">{subtitle(r)}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <span>{kindLabel(r)}{r.kind === "staff" ? ` · ${roleLabel(r.role)}` : ""}</span>
                    <span>{r.village.name} ({r.village.code})</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>

          <nav aria-label="Halaman hasil" className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" className="min-h-10" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft aria-hidden="true" className="h-4 w-4" /> Sebelumnya
            </Button>
            <span className="text-sm tabular-nums text-muted-foreground">Halaman {page} dari {totalPages}</span>
            <Button type="button" variant="outline" className="min-h-10" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
              Berikutnya <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </Button>
          </nav>
        </>
      ) : null}

      <AccountDetailSheet
        open={sheetOpen}
        onOpenChange={(v) => {
          setSheetOpen(v);
          if (!v) window.setTimeout(() => lastTrigger.current?.focus(), 0);
        }}
        target={selected}
        onChanged={() => void load(applied, page)}
      />
    </div>
  );
}
