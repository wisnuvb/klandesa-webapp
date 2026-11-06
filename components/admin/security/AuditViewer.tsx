"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Loader2, ScrollText, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ACTION_FILTER_OPTIONS, TARGET_TYPE_LABELS, actionLabel } from "@/lib/platform/admins/audit-labels";
import { apiJson, formatWib } from "./api";

type Item = {
  id: string;
  createdAt: string;
  actorId: number | null;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  villageId: number | null;
  summary: string;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
};
type Page = { items: Item[]; nextCursor: string | null };
type Filters = { actorId: string; action: string; targetType: string; villageId: string; q: string; from: string; to: string };
const EMPTY: Filters = { actorId: "", action: "", targetType: "", villageId: "", q: "", from: "", to: "" };

function toQuery(f: Filters, cursor?: string | null): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v.trim()) p.set(k, v.trim());
  if (cursor) p.set("cursor", cursor);
  p.set("limit", "50");
  return p.toString();
}

export function AuditViewer() {
  const ids = { actor: useId(), action: useId(), target: useId(), village: useId(), q: useId(), from: useId(), to: useId() };
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [items, setItems] = useState<Item[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [admins, setAdmins] = useState<Array<{ id: number; email: string }>>([]);
  const [selected, setSelected] = useState<Item | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    apiJson<{ admins: Array<{ id: number; email: string }> }>("/api/admin/platform-users")
      .then((r) => setAdmins(r.admins))
      .catch(() => undefined);
  }, []);

  const run = useCallback(async (f: Filters) => {
    const my = ++seq.current;
    setError(null);
    setItems(null);
    try {
      const r = await apiJson<Page>(`/api/admin/audit?${toQuery(f)}`);
      if (my !== seq.current) return;
      setItems(r.items);
      setCursor(r.nextCursor);
    } catch (e) {
      if (my !== seq.current) return;
      setError(e instanceof Error ? e.message : "Gagal memuat jejak audit.");
      setItems([]);
    }
  }, []);
  useEffect(() => {
    void run(applied);
  }, [applied, run]);

  async function more() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const r = await apiJson<Page>(`/api/admin/audit?${toQuery(applied, cursor)}`);
      setItems((cur) => [...(cur ?? []), ...r.items]);
      setCursor(r.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat lagi.");
    } finally {
      setLoadingMore(false);
    }
  }

  const set = (k: keyof Filters) => (v: string) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ScrollText className="h-6 w-6" aria-hidden="true" />
          Jejak Audit
        </h1>
        <p className="text-sm text-muted-foreground">
          Catatan hanya-baca atas semua tindakan admin platform. Waktu dalam WIB. Pencarian bebas mencocokkan ID target persis atau awalan email aktor
          (tanpa rentang tanggal: 90 hari terakhir).
        </p>
      </header>

      <Card>
        <CardContent className="pt-6">
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              setApplied(draft);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor={ids.actor}>Aktor</Label>
              <SearchSelect id={ids.actor} value={draft.actorId} onChange={(e) => set("actorId")(e.target.value)} className="w-full">
                <option value="">Semua admin</option>
                {admins.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.email}
                  </option>
                ))}
              </SearchSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={ids.action}>Aksi</Label>
              <SearchSelect id={ids.action} value={draft.action} onChange={(e) => set("action")(e.target.value)} className="w-full">
                <option value="">Semua aksi</option>
                {ACTION_FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SearchSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={ids.target}>Jenis target</Label>
              <SearchSelect id={ids.target} value={draft.targetType} onChange={(e) => set("targetType")(e.target.value)} className="w-full">
                <option value="">Semua jenis</option>
                {Object.entries(TARGET_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </SearchSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={ids.village}>ID desa</Label>
              <Input id={ids.village} inputMode="numeric" pattern="[0-9]*" value={draft.villageId} onChange={(e) => set("villageId")(e.target.value.replace(/\D/g, ""))} placeholder="Mis. 12" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={ids.q}>Cari (ID target atau awalan email aktor)</Label>
              <Input id={ids.q} value={draft.q} onChange={(e) => set("q")(e.target.value)} maxLength={100} placeholder="Mis. 42 atau budi@" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={ids.from}>Dari tanggal</Label>
              <Input id={ids.from} type="date" value={draft.from} onChange={(e) => set("from")(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={ids.to}>Sampai tanggal</Label>
              <Input id={ids.to} type="date" value={draft.to} onChange={(e) => set("to")(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
              <Button type="submit" className="min-h-10">
                <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                Terapkan
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-10"
                onClick={() => {
                  setDraft(EMPTY);
                  setApplied(EMPTY);
                }}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {items ? `${items.length} catatan ditampilkan${cursor ? " (ada yang lebih lama)" : ""}.` : "Memuat…"}
      </p>

      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          {error}
          <Button size="sm" variant="outline" onClick={() => void run(applied)}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      {!items ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : items.length === 0 && !error ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Tidak ada catatan yang cocok dengan saringan ini.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <caption className="sr-only">Jejak audit platform</caption>
            <TableHeader>
              <TableRow>
                <TableHead scope="col" className="whitespace-nowrap">Waktu</TableHead>
                <TableHead scope="col" className="hidden sm:table-cell">Aktor</TableHead>
                <TableHead scope="col">Aksi</TableHead>
                <TableHead scope="col" className="hidden md:table-cell">Target</TableHead>
                <TableHead scope="col" className="hidden lg:table-cell">Ringkasan</TableHead>
                <TableHead scope="col" className="hidden xl:table-cell">IP</TableHead>
                <TableHead scope="col" className="w-20 text-right">
                  <span className="sr-only">Detail</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="whitespace-normal text-xs tabular-nums sm:whitespace-nowrap">
                    {formatWib(it.createdAt, true)}
                    <div className="mt-0.5 break-all text-muted-foreground sm:hidden">{it.actorEmail}</div>
                  </TableCell>
                  <TableCell className="hidden max-w-[12rem] whitespace-normal break-all text-xs sm:table-cell">{it.actorEmail}</TableCell>
                  <TableCell className="whitespace-normal">
                    <div className="text-sm font-medium">{actionLabel(it.action)}</div>
                    <div className="break-all font-mono text-[11px] text-muted-foreground">{it.action}</div>
                  </TableCell>
                  <TableCell className="hidden text-xs md:table-cell">
                    <Badge variant="outline">{TARGET_TYPE_LABELS[it.targetType] ?? it.targetType}</Badge>
                    {it.targetId ? <span className="ml-1 tabular-nums">#{it.targetId}</span> : null}
                    {it.villageId ? <div className="mt-0.5 text-muted-foreground">Desa #{it.villageId}</div> : null}
                  </TableCell>
                  <TableCell className="hidden max-w-sm whitespace-normal text-xs lg:table-cell">{it.summary}</TableCell>
                  <TableCell className="hidden font-mono text-[11px] xl:table-cell">{it.ipAddress ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="min-h-10" onClick={() => setSelected(it)} aria-label={`Lihat detail catatan ${it.id}`}>
                      Detail
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {cursor ? (
        <div className="flex justify-center">
          <Button variant="outline" className="min-h-10" onClick={() => void more()} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
            Muat lebih lama
          </Button>
        </div>
      ) : null}

      <Sheet open={selected != null} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>{actionLabel(selected.action)}</SheetTitle>
                <SheetDescription>{formatWib(selected.createdAt, true)}</SheetDescription>
              </SheetHeader>
              <dl className="space-y-3 px-4 pb-6 text-sm">
                <Field label="Ringkasan" value={selected.summary} />
                <Field label="Aktor" value={`${selected.actorEmail}${selected.actorId ? ` (#${selected.actorId})` : ""}`} />
                <Field label="Kode aksi" value={selected.action} mono />
                <Field label="Target" value={`${TARGET_TYPE_LABELS[selected.targetType] ?? selected.targetType}${selected.targetId ? ` #${selected.targetId}` : ""}`} />
                {selected.villageId ? <Field label="Desa" value={`#${selected.villageId}`} /> : null}
                <Field label="Alamat IP" value={selected.ipAddress ?? "-"} mono />
                <Field label="Peramban" value={selected.userAgent ?? "-"} />
                <Field label="ID catatan" value={selected.id} mono />
                <div>
                  <dt className="text-muted-foreground">Metadata</dt>
                  <dd>
                    {selected.metadata ? (
                      <pre className="mt-1 max-h-80 overflow-auto rounded-md bg-muted p-3 font-mono text-xs">{JSON.stringify(selected.metadata, null, 2)}</pre>
                    ) : (
                      <span>-</span>
                    )}
                  </dd>
                </div>
              </dl>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`break-words ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
