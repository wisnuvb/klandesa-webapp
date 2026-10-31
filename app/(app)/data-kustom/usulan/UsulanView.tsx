"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Inbox, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApiGet } from "@/hooks/useApiGet";
import { formatCell } from "@/lib/custom-data/ui-model";
import type { ProposalChange, ProposalView } from "@/lib/proposals/service";

interface ListResponse {
  canDecide: boolean;
  pending: number;
  items: ProposalView[];
}

const fmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
const when = (iso: string) => fmt.format(new Date(iso));

const STATUS = {
  PENDING: { label: "Menunggu keputusan", Icon: Clock, cls: "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50" },
  APPLIED: { label: "Disetujui", Icon: CheckCircle2, cls: "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-50" },
  REJECTED: { label: "Ditolak", Icon: XCircle, cls: "border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50" },
  EXPIRED: { label: "Kedaluwarsa", Icon: Clock, cls: "border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50" },
} as const;

const show = (c: ProposalChange, v: unknown) => {
  const text = formatCell(v, { type: c.type as never, options: null });
  return text === "" ? "(kosong)" : text;
};

type Decision = { kind: "approve" | "reject"; item: ProposalView };

export function UsulanView() {
  const [history, setHistory] = useState(false);
  const res = useApiGet<ListResponse>(`/api/custom-data/proposals${history ? "?status=all" : ""}`);
  const [deciding, setDeciding] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(d: Decision) {
    setError(null);
    setReason("");
    setDeciding(d);
  }

  async function submit() {
    if (!deciding) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/custom-data/proposals/${deciding.item.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: deciding.kind, reason: deciding.kind === "reject" ? reason : undefined }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(typeof j?.error === "string" ? j.error : "Gagal memutuskan. Coba lagi.");
      toast.success(deciding.kind === "approve" ? "Usulan disetujui dan data sudah berubah." : "Usulan ditolak. Data tidak berubah.");
      setDeciding(null);
      res.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memutuskan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link href="/data-kustom" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-2 hover:underline">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Kembali ke Data Kustom
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <Inbox aria-hidden="true" className="size-6" />
          Usulan dari aplikasi lain
        </h1>
        <p className="max-w-prose text-muted-foreground">
          Aplikasi yang memakai kunci API Anda tidak bisa mengubah data langsung. Mereka hanya mengusulkan, dan data baru berubah setelah Anda menyetujui. Periksa isi usulan dengan teliti.
        </p>
      </header>

      <div role="group" aria-label="Tampilan" className="flex gap-2">
        <Button type="button" variant={history ? "outline" : "default"} className="min-h-11" aria-pressed={!history} onClick={() => setHistory(false)}>
          Menunggu{res.data && !history ? ` (${res.data.pending})` : ""}
        </Button>
        <Button type="button" variant={history ? "default" : "outline"} className="min-h-11" aria-pressed={history} onClick={() => setHistory(true)}>
          Riwayat
        </Button>
      </div>

      {res.loading ? (
        <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          Memuat usulan…
        </p>
      ) : null}
      {res.error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{res.error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={res.reload}>
            Coba lagi
          </Button>
        </div>
      ) : null}
      {res.data && res.data.items.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{history ? "Belum ada usulan." : "Tidak ada usulan yang menunggu."}</p>
      ) : null}
      {res.data && !res.data.canDecide && res.data.items.length > 0 ? <p className="text-sm text-muted-foreground">Hanya admin atau sekretaris desa yang dapat memutuskan usulan.</p> : null}

      {res.data ? (
        <ul className="space-y-3">
          {res.data.items.map((p) => {
            const st = STATUS[p.status];
            return (
              <li key={p.id} className="space-y-3 rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">
                      {p.operation === "create" ? "Tambah data" : `Ubah data #${p.recordId}`} di {p.tableName}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Dari {p.keyName ?? "aplikasi"}
                      {p.keyPrefix ? ` (${p.keyPrefix}…)` : ""} · {when(p.createdAt)}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${st.cls}`}>
                    <st.Icon aria-hidden="true" className="size-4" />
                    {st.label}
                  </span>
                </div>

                <dl className="divide-y rounded-md border text-sm">
                  {p.changes.map((c) => (
                    <div key={c.key} className="grid gap-1 p-3 sm:grid-cols-3">
                      <dt className="font-medium">{c.label}</dt>
                      <dd className="sm:col-span-2">
                        {"before" in c ? (
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-muted-foreground line-through">{show(c, c.before)}</span>
                            <ArrowRight aria-label="menjadi" className="size-4" />
                            <strong>{show(c, c.value)}</strong>
                          </span>
                        ) : (
                          show(c, c.value)
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>

                {p.note ? (
                  <p className="rounded-md bg-muted p-3 text-sm">
                    <span className="block text-xs text-muted-foreground">Catatan dari aplikasi (belum tentu benar):</span>
                    <span className="whitespace-pre-wrap break-words">{p.note}</span>
                  </p>
                ) : null}
                {p.status === "REJECTED" && p.rejectionReason ? <p className="text-sm text-muted-foreground">Alasan ditolak: {p.rejectionReason}</p> : null}
                {p.status === "PENDING" ? <p className="text-xs text-muted-foreground">Kedaluwarsa otomatis {when(p.expiresAt)}.</p> : null}

                {p.status === "PENDING" && res.data!.canDecide ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" className="min-h-11" onClick={() => open({ kind: "approve", item: p })}>
                      Setujui
                    </Button>
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => open({ kind: "reject", item: p })}>
                      Tolak
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <AlertDialog open={deciding != null} onOpenChange={(o) => (!o && !busy ? setDeciding(null) : undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deciding?.kind === "approve" ? "Setujui usulan ini?" : "Tolak usulan ini?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {deciding?.kind === "approve"
                ? "Data di tabel akan langsung berubah sesuai usulan, dan perubahannya tercatat atas nama Anda."
                : "Data tidak berubah. Aplikasi pengusul bisa melihat alasan penolakan."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deciding?.kind === "reject" ? (
            <div className="space-y-1.5">
              <Label htmlFor="alasan-tolak">Alasan (boleh dikosongkan)</Label>
              <Textarea id="alasan-tolak" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: Data ganda" />
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11" disabled={busy}>
              Batal
            </AlertDialogCancel>
            <Button type="button" variant={deciding?.kind === "reject" ? "destructive" : "default"} className="min-h-11" disabled={busy} onClick={() => void submit()}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
              {deciding?.kind === "approve" ? "Ya, setujui" : "Ya, tolak"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
