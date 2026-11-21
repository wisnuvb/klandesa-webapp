"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, Inbox, Loader2, MapPin, MessageCircle, RotateCcw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiJson, formatWib } from "@/components/admin/security/api";
import {
  CONTACT_ROLES,
  ageLabel,
  contactRoleLabel,
  contactSourceLabel,
  contactWaLink,
  extractVillageFromMessage,
  isSyntheticContactEmail,
} from "@/lib/contacts/lead";

type ContactRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  source: string;
  role: string | null;
  position: string | null;
  isResponded: boolean;
  respondedAt: string | null;
  createdAt: string;
};
type Counts = { total: number; unresponded: number; unrespondedAds: number };
type Page = { contacts: ContactRow[]; nextCursor: string | null; counts: Counts };
type Status = "belum" | "sudah" | "semua";
type Filters = { status: Status; source: string; role: string; q: string };

const DEFAULT_FILTERS: Filters = { status: "belum", source: "", role: "", q: "" };
const SOURCE_OPTIONS = ["iklan-meta", "demo", "landing"];

function toQuery(f: Filters, cursor?: string | null): string {
  const p = new URLSearchParams();
  if (f.status === "belum") p.set("responded", "false");
  if (f.status === "sudah") p.set("responded", "true");
  if (f.source) p.set("source", f.source);
  if (f.role) p.set("role", f.role);
  if (f.q.trim()) p.set("q", f.q.trim());
  if (cursor) p.set("cursor", cursor);
  p.set("limit", "30");
  return p.toString();
}

export function ContactsInbox() {
  const ids = { status: useId(), source: useId(), role: useId(), q: useId() };
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<Filters>(DEFAULT_FILTERS);
  const [rows, setRows] = useState<ContactRow[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const seq = useRef(0);

  const run = useCallback(async (f: Filters) => {
    const my = ++seq.current;
    setError(null);
    setRows(null);
    try {
      const r = await apiJson<Page>(`/api/contacts?${toQuery(f)}`);
      if (my !== seq.current) return;
      setRows(r.contacts);
      setCursor(r.nextCursor);
      setCounts(r.counts);
    } catch (e) {
      if (my !== seq.current) return;
      setError(e instanceof Error ? e.message : "Gagal memuat kontak.");
      setRows([]);
    }
  }, []);
  useEffect(() => {
    void run(applied);
  }, [applied, run]);

  async function more() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const r = await apiJson<Page>(`/api/contacts?${toQuery(applied, cursor)}`);
      setRows((cur) => [...(cur ?? []), ...r.contacts]);
      setCursor(r.nextCursor);
      setCounts(r.counts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat lagi.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function toggle(row: ContactRow) {
    const next = !row.isResponded;
    setBusyId(row.id);
    setError(null);
    try {
      await apiJson(`/api/contacts/${row.id}`, { method: "PATCH", body: { isResponded: next } });
      setCounts((c) =>
        c
          ? {
              ...c,
              unresponded: c.unresponded + (next ? -1 : 1),
              unrespondedAds: c.unrespondedAds + (row.source === "iklan-meta" ? (next ? -1 : 1) : 0),
            }
          : c,
      );
      setRows((cur) =>
        (cur ?? [])
          // Di tab "Belum dihubungi" / "Sudah dihubungi", baris yang statusnya berubah keluar dari daftar.
          .filter((r) => !(r.id === row.id && applied.status !== "semua"))
          .map((r) => (r.id === row.id ? { ...r, isResponded: next, respondedAt: next ? new Date().toISOString() : null } : r)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan status.");
    } finally {
      setBusyId(null);
    }
  }

  const set = <K extends keyof Filters>(k: K) => (v: Filters[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Inbox className="h-6 w-6" aria-hidden="true" />
          Kontak Masuk
        </h1>
        <p className="text-sm text-muted-foreground">
          Orang yang meminta dihubungi lewat formulir landing dan iklan. Balas lewat WhatsApp, lalu tandai sudah dihubungi. Setiap kontak baru juga dikirim
          ke email pemilik.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Ringkasan kontak">
        <Stat label="Belum dihubungi" value={counts?.unresponded} emphasis={(counts?.unresponded ?? 0) > 0} />
        <Stat label="Belum dihubungi dari iklan Meta" value={counts?.unrespondedAds} emphasis={(counts?.unrespondedAds ?? 0) > 0} />
        <Stat label="Semua kontak" value={counts?.total} />
      </div>

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
              <Label htmlFor={ids.status}>Status</Label>
              <SearchSelect id={ids.status} value={draft.status} onChange={(e) => set("status")(e.target.value as Status)} className="w-full">
                <option value="belum">Belum dihubungi</option>
                <option value="sudah">Sudah dihubungi</option>
                <option value="semua">Semua</option>
              </SearchSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={ids.source}>Sumber</Label>
              <SearchSelect id={ids.source} value={draft.source} onChange={(e) => set("source")(e.target.value)} className="w-full">
                <option value="">Semua sumber</option>
                {SOURCE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {contactSourceLabel(s)}
                  </option>
                ))}
              </SearchSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={ids.role}>Peran pengirim</Label>
              <SearchSelect id={ids.role} value={draft.role} onChange={(e) => set("role")(e.target.value)} className="w-full">
                <option value="">Semua peran</option>
                {CONTACT_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {contactRoleLabel(r)}
                  </option>
                ))}
                <option value="none">Belum diisi (data lama)</option>
              </SearchSelect>
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label htmlFor={ids.q}>Cari (nama, nomor, jabatan, desa, pesan)</Label>
              <Input id={ids.q} value={draft.q} onChange={(e) => set("q")(e.target.value)} maxLength={100} placeholder="Mis. Sumberharjo atau 0812" />
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
                  setDraft(DEFAULT_FILTERS);
                  setApplied(DEFAULT_FILTERS);
                }}
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {rows ? `${rows.length} kontak ditampilkan${cursor ? " (ada yang lebih lama)" : ""}.` : "Memuat…"}
      </p>

      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          {error}
          <Button size="sm" variant="outline" onClick={() => void run(applied)}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      {!rows ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : rows.length === 0 && !error ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {applied.status === "belum" && !applied.q && !applied.source && !applied.role ? "Semua kontak sudah dihubungi." : "Tidak ada kontak yang cocok dengan saringan ini."}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const wa = contactWaLink(r.phone, `Halo ${r.name}, kami dari Klandesa. Terima kasih sudah mengisi formulir. `);
            const village = extractVillageFromMessage(r.message);
            const created = new Date(r.createdAt);
            return (
              <li key={r.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words text-base font-semibold">{r.name}</p>
                    <p className="text-sm tabular-nums text-muted-foreground">{r.phone ?? "Tanpa nomor"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={r.source === "iklan-meta" ? "default" : "outline"}>{contactSourceLabel(r.source)}</Badge>
                    <Badge variant={r.role === "perangkat_desa" ? "secondary" : "outline"}>
                      {contactRoleLabel(r.role)}
                      {r.position ? ` · ${r.position}` : ""}
                    </Badge>
                    {r.isResponded ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        Sudah dihubungi
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Belum dihubungi</Badge>
                    )}
                  </div>
                </div>

                {village ? (
                  <p className="mt-2 flex items-center gap-1.5 text-sm">
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    {village}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatWib(r.createdAt)} · {ageLabel(created)}
                  {r.email && !isSyntheticContactEmail(r.email) ? ` · ${r.email}` : ""}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{r.subject}</p>
                <details className="mt-1 text-sm">
                  <summary className="cursor-pointer text-muted-foreground underline-offset-2 hover:underline">Lihat pesan lengkap</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-muted p-3 font-sans text-xs">{r.message}</pre>
                </details>

                <div className="mt-3 flex flex-wrap gap-2">
                  {wa ? (
                    <Button asChild className="min-h-10">
                      <a href={wa} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                        Chat WhatsApp
                      </a>
                    </Button>
                  ) : null}
                  <Button variant="outline" className="min-h-10" disabled={busyId === r.id} onClick={() => void toggle(r)}>
                    {busyId === r.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    ) : r.isResponded ? (
                      <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    )}
                    {r.isResponded ? "Tandai belum dihubungi" : "Tandai sudah dihubungi"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {cursor ? (
        <div className="flex justify-center">
          <Button variant="outline" className="min-h-10" onClick={() => void more()} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
            Muat lebih lama
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, emphasis }: { label: string; value: number | undefined; emphasis?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${emphasis ? "border-destructive/40 bg-destructive/5" : "bg-card"}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value ?? "–"}</p>
    </div>
  );
}
