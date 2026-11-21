"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ExternalLink, EyeOff, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { apiJson, formatWib } from "@/components/admin/security/api";
import { FLAG_REASON_LABELS, MODERATION_LABELS, LIMITS, type FlagReason, type ModerationStatus } from "@/lib/aspirasi/catalog";
import { Pager } from "./Pager";
import type { AdminFlag, FlagPage } from "./types";

const STATUS_LABEL = { OPEN: "Terbuka", ACTIONED: "Ditindaklanjuti", DISMISSED: "Ditolak" } as const;

export function FlagsTab({ onCounts, onOpenAspiration }: { onCounts: (open: number) => void; onOpenAspiration: (code: string) => void }) {
  const sid = useId();
  const [status, setStatus] = useState("OPEN");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<FlagPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const run = useCallback(async (st: string, pg: number) => {
    const my = ++seq.current;
    try {
      const sp = new URLSearchParams({ status: st });
      if (pg > 1) sp.set("page", String(pg));
      const r = await apiJson<FlagPage>(`/api/admin/aspirasi/flags?${sp}`);
      if (my !== seq.current) return;
      setData(r);
      setError(null);
      onCounts(r.open);
    } catch (e) {
      if (my !== seq.current) return;
      setError(e instanceof Error ? e.message : "Gagal memuat laporan konten.");
      setData((d) => d ?? { items: [], total: 0, page: 1, pageSize: 20, open: 0 });
    }
  }, [onCounts]);
  useEffect(() => {
    // Muat ulang saat saringan/halaman berubah; state baru diisi sesudah await (urutan dijaga seq).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void run(status, page);
  }, [status, page, run]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={sid}>Status laporan konten</Label>
            <SearchSelect id={sid} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-full">
              <option value="OPEN">Terbuka</option>
              <option value="ACTIONED">Ditindaklanjuti</option>
              <option value="DISMISSED">Ditolak</option>
            </SearchSelect>
          </div>
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Menutup laporan konten tidak mengubah tampilan aspirasinya. Untuk menyembunyikan atau menghapus aspirasi, buka di tab Moderasi. Laporan konten yang masih terbuka otomatis membuat aspirasi tidak diindeks mesin pencari.
          </p>
        </CardContent>
      </Card>

      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {data ? `${data.total} laporan konten.` : "Memuat…"}
      </p>
      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          {error}
          <Button size="sm" variant="outline" onClick={() => void run(status, page)}>
            Coba lagi
          </Button>
        </div>
      ) : null}

      {!data ? (
        <Skeleton className="h-32 w-full" aria-busy="true" />
      ) : data.items.length === 0 && !error ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{status === "OPEN" ? "Tidak ada laporan konten yang menunggu." : "Tidak ada laporan konten dengan status ini."}</p>
      ) : (
        <ul className="space-y-3">
          {data.items.map((f) => (
            <FlagCard key={f.id} flag={f} onOpenAspiration={onOpenAspiration} onDone={() => void run(status, page)} />
          ))}
        </ul>
      )}
      {data ? <Pager page={page} total={data.total} pageSize={data.pageSize} onPage={setPage} /> : null}
    </div>
  );
}

function FlagCard({ flag, onOpenAspiration, onDone }: { flag: AdminFlag; onOpenAspiration: (code: string) => void; onDone: () => void }) {
  const noteId = useId();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function decide(decision: "action" | "dismiss") {
    setBusy(decision);
    setErr(null);
    try {
      await apiJson(`/api/admin/aspirasi/flags/${flag.id}`, { method: "PATCH", body: { decision, note: note.trim() } });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan keputusan.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{FLAG_REASON_LABELS[flag.reason as FlagReason] ?? flag.reason}</p>
          <p className="text-xs text-muted-foreground">
            {formatWib(flag.createdAt)} · dari {flag.source === "VILLAGE" ? "desa yang mengelola halaman" : "publik"}
            {flag.contact ? ` · kontak: ${flag.contact}` : ""}
          </p>
        </div>
        <Badge variant={flag.status === "OPEN" ? "destructive" : "secondary"}>{STATUS_LABEL[flag.status]}</Badge>
      </div>
      {flag.detail ? <p className="mt-2 whitespace-pre-line break-words text-sm">{flag.detail}</p> : null}

      <p className="mt-3 text-sm">
        Aspirasi: <span className="font-medium">{flag.aspiration.title}</span> ({flag.aspiration.area}) ·{" "}
        <Badge variant="outline">{MODERATION_LABELS[flag.aspiration.status as ModerationStatus] ?? flag.aspiration.status}</Badge>
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {flag.aspiration.status === "PUBLISHED" ? (
          <Button asChild variant="outline" size="sm" className="min-h-10">
            <a href={`/aspirasi/laporan/${flag.aspiration.slug}-${flag.aspiration.code}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
              Lihat halaman publik
            </a>
          </Button>
        ) : null}
        <Button variant="outline" size="sm" className="min-h-10" onClick={() => onOpenAspiration(flag.aspiration.code)}>
          <EyeOff className="mr-2 h-4 w-4" aria-hidden="true" />
          Buka di Moderasi (sembunyikan/hapus)
        </Button>
      </div>

      {flag.status === "OPEN" ? (
        <div className="mt-3 space-y-2 border-t pt-3">
          <Label htmlFor={noteId}>Catatan keputusan (opsional)</Label>
          <Textarea id={noteId} value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={LIMITS.noteMax} />
          {err ? (
            <p role="alert" className="text-sm text-destructive">
              {err}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11" disabled={busy !== null} onClick={() => void decide("action")}>
              {busy === "action" ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Check className="mr-2 h-4 w-4" aria-hidden="true" />}
              Tindak lanjuti
            </Button>
            <Button variant="outline" className="min-h-11" disabled={busy !== null} onClick={() => void decide("dismiss")}>
              {busy === "dismiss" ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <X className="mr-2 h-4 w-4" aria-hidden="true" />}
              Tolak laporan
            </Button>
          </div>
        </div>
      ) : flag.handleNote ? (
        <p className="mt-2 text-sm text-muted-foreground">Catatan keputusan: {flag.handleNote}</p>
      ) : null}
    </li>
  );
}
