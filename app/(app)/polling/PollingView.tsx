"use client";

import { useState } from "react";
import { BarChart3, Loader2, Pencil, Plus, Send, Square, Trash2, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormErrorSummary } from "@/components/app/FormErrorSummary";
import { useApiGet } from "@/hooks/useApiGet";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { STATUS_LABEL } from "@/lib/polls/catalog";
import type { PollResults, PollView } from "@/lib/polls/service";
import { PollFormDialog } from "./PollFormDialog";

type Row = PollView & { votes: number };
interface ListResponse {
  polls: Row[];
  can: { create: boolean; update: boolean; delete: boolean };
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-");
type Dlg = { kind: "form"; poll: PollView | null } | { kind: "results"; poll: Row } | { kind: "act"; poll: Row; action: "publish" | "close" | "delete" };

export function PollingView() {
  const list = useApiGet<ListResponse>("/api/polls");
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const d = list.data;
  const done = () => { setDlg(null); list.reload(); };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Vote aria-hidden="true" className="size-6" />
            Polling Warga
          </h1>
          <p className="max-w-prose text-muted-foreground">
            Ajukan pertanyaan kepada warga dan kumpulkan suara lewat aplikasi warga. Satu warga satu suara; pilihan tidak dapat dilacak ke orangnya. Hasil polling untuk bahan pertimbangan dan tidak menggantikan keputusan musyawarah desa.
          </p>
        </div>
        {d?.can.create ? (
          <Button type="button" size="lg" className="min-h-11" onClick={() => setDlg({ kind: "form", poll: null })}>
            <Plus aria-hidden="true" />
            Buat polling
          </Button>
        ) : null}
      </header>

      {list.loading ? (
        <p role="status" className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
          Memuat polling…
        </p>
      ) : null}
      {list.error ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <p>{list.error}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={list.reload}>Coba lagi</Button>
        </div>
      ) : null}
      {d && d.polls.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">Belum ada polling.</p>
        </div>
      ) : null}

      {d && d.polls.length > 0 ? (
        <ul className="space-y-3">
          {d.polls.map((p) => (
            <li key={p.id} className="rounded-lg border bg-card p-4 text-card-foreground">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className={`rounded border px-2 py-0.5 font-medium ${p.status === "OPEN" ? "border-emerald-500 text-emerald-800 dark:text-emerald-300" : ""}`}>{STATUS_LABEL[p.status]}</span>
                    <span className="text-muted-foreground">{p.options.length} pilihan · umur ≥ {p.minAge} tahun</span>
                  </p>
                  <h2 className="break-words font-semibold">{p.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {p.status === "DRAFT" ? `Rencana ditutup ${fmt(p.closesAt)}` : `${fmt(p.opensAt)} s.d. ${fmt(p.closedAt ?? p.closesAt)} · ${p.votes} suara`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.status !== "DRAFT" ? (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setDlg({ kind: "results", poll: p })} aria-label={`Lihat hasil ${p.title}`}>
                      <BarChart3 aria-hidden="true" />
                      Hasil
                    </Button>
                  ) : null}
                  {p.status === "DRAFT" && d.can.update ? (
                    <>
                      <Button type="button" variant="outline" className="min-h-11" onClick={() => setDlg({ kind: "form", poll: p })} aria-label={`Ubah ${p.title}`}><Pencil aria-hidden="true" />Ubah</Button>
                      <Button type="button" className="min-h-11" onClick={() => setDlg({ kind: "act", poll: p, action: "publish" })} aria-label={`Terbitkan ${p.title}`}><Send aria-hidden="true" />Terbitkan</Button>
                    </>
                  ) : null}
                  {p.status === "DRAFT" && d.can.delete ? (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setDlg({ kind: "act", poll: p, action: "delete" })} aria-label={`Hapus draf ${p.title}`}><Trash2 aria-hidden="true" />Hapus</Button>
                  ) : null}
                  {(p.status === "OPEN" || p.status === "SCHEDULED") && d.can.update ? (
                    <Button type="button" variant="outline" className="min-h-11" onClick={() => setDlg({ kind: "act", poll: p, action: "close" })} aria-label={`Tutup ${p.title}`}><Square aria-hidden="true" />Tutup</Button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {dlg?.kind === "form" ? <PollFormDialog poll={dlg.poll} onClose={() => setDlg(null)} onSaved={done} /> : null}
      {dlg?.kind === "results" ? <ResultsDialog poll={dlg.poll} onClose={() => setDlg(null)} /> : null}
      {dlg?.kind === "act" ? <ActDialog poll={dlg.poll} action={dlg.action} onClose={() => setDlg(null)} onDone={done} /> : null}
    </div>
  );
}

function ResultsDialog({ poll, onClose }: { poll: Row; onClose: () => void }) {
  const { data, loading, error } = useApiGet<{ poll: PollView; results: PollResults }>(`/api/polls/${poll.id}`);
  const r = data?.results;
  return (
    <Dialog open onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{poll.title}</DialogTitle>
          <DialogDescription>{STATUS_LABEL[poll.status]}. Hasil berupa jumlah suara; tidak ada data siapa memilih apa.</DialogDescription>
        </DialogHeader>
        {loading ? <p role="status" className="flex items-center gap-2 text-muted-foreground"><Loader2 aria-hidden="true" className="size-4 animate-spin" />Memuat…</p> : null}
        {error ? <p role="alert" className="text-destructive">{error}</p> : null}
        {r ? (
          <div className="space-y-4">
            <ul className="space-y-3">
              {poll.options.map((o, i) => {
                const pct = r.total > 0 ? Math.round((r.counts[i] / r.total) * 1000) / 10 : 0;
                return (
                  <li key={i} className="space-y-1">
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="min-w-0 break-words font-medium">{o}</span>
                      <span className="shrink-0 tabular-nums">{r.counts[i]} suara ({String(pct).replace(".", ",")}%)</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded bg-muted" role="presentation">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="text-sm text-muted-foreground">
              {r.total} suara dari {r.eligible} warga yang berhak (partisipasi {String(r.turnoutPercent).replace(".", ",")}%).
            </p>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" className="min-h-11" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ACT: Record<"publish" | "close" | "delete", { title: string; text: string; button: string; destructive: boolean }> = {
  publish: { title: "Terbitkan polling?", text: "Setelah diterbitkan, pertanyaan dan pilihan dikunci dan polling tampil di aplikasi warga.", button: "Terbitkan", destructive: false },
  close: { title: "Tutup polling sekarang?", text: "Suara tidak dapat diterima lagi dan hasil langsung tampil ke warga. Tindakan ini tidak dapat dibatalkan.", button: "Tutup polling", destructive: true },
  delete: { title: "Hapus draf?", text: "Draf polling dihapus permanen.", button: "Hapus", destructive: true },
};

function ActDialog({ poll, action, onClose, onDone }: { poll: Row; action: "publish" | "close" | "delete"; onClose: () => void; onDone: () => void }) {
  const { busy, general, summaryRef, submit } = useFormSubmit();
  const c = ACT[action];
  return (
    <Dialog open onOpenChange={(o) => (!o && !busy ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{c.title}</DialogTitle>
          <DialogDescription>&ldquo;{poll.title}&rdquo;. {c.text}</DialogDescription>
        </DialogHeader>
        <FormErrorSummary innerRef={summaryRef} errors={{}} general={general} labels={{}} />
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>Batal</Button>
          <Button
            type="button"
            variant={c.destructive ? "destructive" : "default"}
            className="min-h-11"
            disabled={busy}
            onClick={async () => {
              const ok = action === "delete" ? await submit(`/api/polls/${poll.id}`, "DELETE", undefined, "Gagal menghapus. Coba lagi.") : await submit(`/api/polls/${poll.id}/aksi`, "POST", { action }, "Gagal memproses. Coba lagi.");
              if (ok) onDone();
            }}
          >
            {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
            {c.button}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
