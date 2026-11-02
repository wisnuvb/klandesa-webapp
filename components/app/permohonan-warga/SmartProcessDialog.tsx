"use client";

import { useState } from "react";
import { AlertTriangle, CheckCheck, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import type { SmartManual, SmartProposal } from "@/lib/mail/request-smart";
import { ageLabel, readApiError } from "./shared";

type Phase = "intro" | "running" | "review" | "done";
type Outcome = { requestId: number; ok: boolean; error?: string };

export function SmartProcessDialog({
  open,
  onOpenChange,
  onChanged,
  onOpenRequest,
  readyCount,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
  onOpenRequest: (id: number) => void;
  readyCount: number;
}) {
  const { appConfirm } = useAppDialogs();
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<SmartProposal[]>([]);
  const [manual, setManual] = useState<SmartManual[]>([]);
  const [considered, setConsidered] = useState(0);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [credits, setCredits] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);

  function reset() {
    setPhase("intro");
    setError(null);
    setProposals([]);
    setManual([]);
    setPicked(new Set());
    setOutcomes([]);
  }

  async function start() {
    setPhase("running");
    setError(null);
    try {
      const res = await fetch("/api/mail-requests/smart-process", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!res.ok) {
        setError(await readApiError(res, "Proses cerdas gagal."));
        setPhase("intro");
        return;
      }
      const data = (await res.json()) as { proposals: SmartProposal[]; manual: SmartManual[]; considered: number; remainingCredits: number };
      setProposals(data.proposals);
      setManual(data.manual);
      setConsidered(data.considered);
      setCredits(data.remainingCredits);
      setPicked(new Set());
      setPhase("review");
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.");
      setPhase("intro");
    }
  }

  function toggle(id: number) {
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function approveSelected() {
    const chosen = proposals.filter((p) => picked.has(p.requestId));
    if (chosen.length === 0) return;
    const ok = await appConfirm({
      title: `Setujui ${chosen.length} permohonan?`,
      description: "Setiap permohonan terpilih akan disetujui dan warganya diberi tahu. Pastikan Anda sudah membaca keperluan masing-masing.",
      confirmLabel: `Setujui ${chosen.length}`,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ai/actions/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens: chosen.map((p) => p.card.token) }),
      });
      if (!res.ok) {
        toast.error(await readApiError(res, "Gagal menyetujui."));
        return;
      }
      const data = (await res.json()) as { results: Array<{ ok: boolean; error?: string }> };
      const out = chosen.map((p, i) => ({ requestId: p.requestId, ok: data.results[i]?.ok === true, error: data.results[i]?.error }));
      setOutcomes(out);
      setPhase("done");
      const okN = out.filter((o) => o.ok).length;
      if (okN > 0) toast.success(`${okN} permohonan disetujui`);
      if (okN < out.length) toast.error(`${out.length - okN} gagal; lihat rinciannya`);
      onChanged();
    } catch {
      toast.error("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setTimeout(reset, 200); }}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-violet-700" aria-hidden /> Proses Cerdas</DialogTitle>
          <DialogDescription>AI menyiapkan usulan; Anda yang memilih dan menyetujui.</DialogDescription>
        </DialogHeader>

        {phase === "intro" || phase === "running" ? (
          <div className="space-y-4">
            <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
              <li>Memeriksa hingga 10 permohonan <b>tertua</b> yang siap diputuskan ({readyCount} siap saat ini).</li>
              <li>Hanya yang <b>lolos semua pemeriksaan otomatis</b> (NIK valid, warga terdata, tanpa duplikat) yang dinilai AI kecocokan jenis surat dengan keperluannya.</li>
              <li>Yang dinilai cocok diusulkan <b>setuju</b>; sisanya ditandai untuk Anda baca sendiri. Tidak ada yang berubah sebelum Anda memilih dan mengonfirmasi.</li>
              <li>Nama dan NIK pemohon tidak dikirim ke AI. Biaya <b>1 kredit AI</b> per proses (dikembalikan bila gagal).</li>
            </ul>
            {error ? <p role="alert" className="flex items-start gap-2 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {error}</p> : null}
            <div className="flex justify-end">
              <Button className="gap-2" onClick={() => void start()} disabled={phase === "running" || readyCount === 0}>
                {phase === "running" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
                {phase === "running" ? "Memeriksa…" : readyCount === 0 ? "Tidak ada yang siap" : "Mulai proses cerdas"}
              </Button>
            </div>
          </div>
        ) : null}

        {phase === "review" ? (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground" role="status">
              {considered} permohonan diperiksa: <b>{proposals.length}</b> diusulkan setuju, <b>{manual.length}</b> perlu dibaca staf.
              {credits != null ? ` Sisa kredit AI: ${credits}.` : ""}
            </p>

            {proposals.length > 0 ? (
              <section aria-labelledby="sp-prop">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 id="sp-prop" className="text-sm font-semibold">Usulan setuju</h3>
                  <Button size="sm" variant="outline" onClick={() => setPicked(picked.size === proposals.length ? new Set() : new Set(proposals.map((p) => p.requestId)))}>
                    {picked.size === proposals.length ? "Batalkan semua pilihan" : "Pilih semua rekomendasi"}
                  </Button>
                </div>
                <ul className="divide-y rounded-md border">
                  {proposals.map((p) => (
                    <li key={p.requestId} className="flex gap-3 p-3">
                      <Checkbox className="mt-1" checked={picked.has(p.requestId)} onCheckedChange={() => toggle(p.requestId)} aria-label={`Pilih ${p.requestNumber} atas nama ${p.name}`} />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-medium">{p.name} <span className="font-normal text-muted-foreground">· {p.mailType}</span></p>
                        <p className="line-clamp-3 text-muted-foreground">“{p.purpose}”</p>
                        <p className="mt-1 text-xs text-green-800">AI: {p.reason}</p>
                        <p className="text-xs text-muted-foreground">{p.requestNumber} · {ageLabel(p.ageDays)}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => onOpenRequest(p.requestId)}>Tinjau</Button>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex justify-end">
                  <Button className="gap-2" disabled={picked.size === 0 || busy} onClick={() => void approveSelected()}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCheck className="h-4 w-4" aria-hidden />}
                    Setujui {picked.size > 0 ? `${picked.size} terpilih` : "yang dipilih"}
                  </Button>
                </div>
              </section>
            ) : (
              <p className="rounded-md bg-muted/50 p-3 text-sm">Tidak ada permohonan yang bisa diusulkan setuju secara otomatis. Tinjau satu per satu di bawah.</p>
            )}

            {manual.length > 0 ? (
              <section aria-labelledby="sp-man">
                <h3 id="sp-man" className="mb-2 text-sm font-semibold">Perlu dibaca staf</h3>
                <ul className="divide-y rounded-md border">
                  {manual.map((m) => (
                    <li key={m.requestId} className="flex items-start gap-3 p-3 text-sm">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{m.name} <span className="font-normal text-muted-foreground">· {m.mailType}</span></p>
                        <ul className="ml-4 list-disc text-muted-foreground">{m.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => onOpenRequest(m.requestId)}>Tinjau</Button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}

        {phase === "done" ? (
          <div className="space-y-3">
            <ul className="divide-y rounded-md border text-sm">
              {outcomes.map((o) => {
                const p = proposals.find((x) => x.requestId === o.requestId);
                return (
                  <li key={o.requestId} className="flex items-center justify-between gap-2 p-3">
                    <span>{p?.name} <span className="text-muted-foreground">· {p?.requestNumber}</span></span>
                    {o.ok ? <Badge className="bg-green-600">Disetujui</Badge> : <Badge variant="destructive" title={o.error}>Gagal: {o.error ?? "coba lagi"}</Badge>}
                  </li>
                );
              })}
            </ul>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={reset}>Proses lagi</Button>
              <Button onClick={() => onOpenChange(false)}>Selesai</Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
