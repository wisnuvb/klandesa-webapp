"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCopy, HelpCircle, Loader2, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { readApiError } from "./shared";
import type { AssistResult } from "@/lib/mail/request-assist";

const LEVEL: Record<AssistResult["kecocokan"]["tingkat"], { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  cocok: { label: "Jenis surat cocok", cls: "border-green-500 bg-green-50 text-green-800", Icon: CheckCircle2 },
  perlu_dicek: { label: "Perlu dicek", cls: "border-amber-400 bg-amber-50 text-amber-800", Icon: HelpCircle },
  tidak_cocok: { label: "Tidak cocok", cls: "border-red-400 bg-red-50 text-red-800", Icon: XCircle },
};

const RECO: Record<AssistResult["rekomendasi"], string> = {
  setujui: "Saran: setujui",
  minta_lengkapi: "Saran: minta dilengkapi",
  tolak: "Saran: tolak",
  perlu_dicek_manual: "Saran: periksa manual",
};

export function AssistPanel({
  requestId,
  onUseApprovalNote,
  onUseRejectReason,
}: {
  requestId: number;
  onUseApprovalNote: (text: string) => void;
  onUseRejectReason: (text: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssistResult | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [cached, setCached] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/mail-requests/${requestId}/assist`, { method: "POST" });
      if (!res.ok) {
        setError(await readApiError(res, "Asisten AI sedang bermasalah."));
        return;
      }
      const data = (await res.json()) as { result: AssistResult; cached: boolean; remainingCredits: number };
      setResult(data.result);
      setCached(data.cached);
      setCredits(data.remainingCredits);
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Pesan disalin");
    } catch {
      toast.error("Tidak bisa menyalin. Salin manual dari kotak teks.");
    }
  }

  return (
    <section className="rounded-lg border border-violet-200 bg-violet-50/50 p-4" aria-labelledby={`assist-${requestId}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`assist-${requestId}`} className="flex items-center gap-2 text-sm font-semibold text-violet-900">
          <Sparkles className="h-4 w-4" aria-hidden /> Asisten AI
        </h3>
        <Button size="sm" variant={result ? "outline" : "default"} className="gap-2" onClick={() => void run()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
          {busy ? "Menelaah…" : result ? "Telaah ulang" : "Telaah dengan AI"}
          {!busy ? <span className="text-xs opacity-70">· 1 kredit</span> : null}
        </Button>
      </div>

      {!result && !error && !busy ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Memeriksa kecocokan jenis surat dengan keperluan, menyebut hal yang perlu dipastikan, dan menyusun draf catatan serta pesan untuk warga.
          Nama dan NIK pemohon tidak dikirim ke AI.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-3 space-y-3 text-sm" aria-live="polite">
          <p>{result.ringkasan}</p>

          <div className="flex flex-wrap items-center gap-2">
            {(() => {
              const l = LEVEL[result.kecocokan.tingkat];
              return (
                <Badge variant="outline" className={`gap-1 ${l.cls}`}>
                  <l.Icon className="h-3 w-3" aria-hidden /> {l.label}
                </Badge>
              );
            })()}
            <Badge variant="secondary">{RECO[result.rekomendasi]}</Badge>
            <span className="text-xs text-muted-foreground">{result.kecocokan.alasan}</span>
          </div>

          {result.perlu_dipastikan.length > 0 ? (
            <div>
              <p className="font-medium">Perlu dipastikan sebelum memutuskan</p>
              <ul className="ml-5 list-disc space-y-0.5 text-muted-foreground">
                {result.perlu_dipastikan.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          ) : null}

          {result.draf_catatan_setuju ? (
            <Draft title="Draf catatan persetujuan" text={result.draf_catatan_setuju} actionLabel="Pakai sebagai catatan" onUse={() => onUseApprovalNote(result.draf_catatan_setuju)} />
          ) : null}
          {result.draf_alasan_tolak ? (
            <Draft title="Draf alasan penolakan / permintaan melengkapi" text={result.draf_alasan_tolak} actionLabel="Pakai sebagai alasan tolak" onUse={() => onUseRejectReason(result.draf_alasan_tolak)} />
          ) : null}
          {result.draf_pesan_warga ? (
            <Draft title="Draf pesan ke warga" text={result.draf_pesan_warga} actionLabel="Salin" icon onUse={() => void copy(result.draf_pesan_warga)} />
          ) : null}

          {result.peringatan.map((w) => (
            <p key={w} className="flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {w}
            </p>
          ))}
          <p className="text-xs text-muted-foreground">
            Ini saran AI, bukan keputusan. Periksa dan sunting sebelum dipakai.
            {cached ? " Hasil tersimpan sementara (tidak memakai kredit)." : ""}
            {credits != null ? ` Sisa kredit AI Anda: ${credits}.` : ""}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function Draft({ title, text, actionLabel, onUse, icon }: { title: string; text: string; actionLabel: string; onUse: () => void; icon?: boolean }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={onUse}>
          {icon ? <ClipboardCopy className="h-3 w-3" aria-hidden /> : null} {actionLabel}
        </Button>
      </div>
      <p className="whitespace-pre-wrap">{text}</p>
    </div>
  );
}
