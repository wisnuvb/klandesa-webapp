"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileText, History, Loader2, Printer, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import { AssistPanel } from "./AssistPanel";
import { CHANNEL_LABEL, formatDateTime, readApiError, RtBadge, StatusBadge, type QueueRow } from "./shared";

type Detail = {
  request: QueueRow;
  formNote: string | null;
  resident: { id: number; name: string; address: string; rt: string | null; rw: string | null; phone: string | null; isAlive: boolean } | null;
  template: { id: number; name: string } | null;
  letter: { id: number; letterNumber: string; letterDate: string; status: string } | null;
  history: Array<{ id: number; requestNumber: string; mailType: string; status: string; requestDate: string }>;
};

const HISTORY_LABEL: Record<string, string> = { pending: "Menunggu", approved: "Selesai", rejected: "Ditolak" };

export function RequestDetailDialog({
  id,
  canDecide,
  onClose,
  onChanged,
}: {
  id: number | null;
  canDecide: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { appConfirm } = useAppDialogs();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "approve" | "reject">(null);

  const load = useCallback(async (rid: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/mail-requests/${rid}`);
      if (!res.ok) throw new Error(await readApiError(res, "Gagal memuat rincian permohonan"));
      setDetail((await res.json()) as Detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat rincian permohonan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setDetail(null);
    setNote("");
    setNoteError(null);
    if (id != null) void load(id);
  }, [id, load]);

  const r = detail?.request;
  const pending = r?.status === "PENDING";
  const ready = !!r?.checks?.ready;
  const rtRejected = r?.rtStatus === "rejected";

  async function decide(decision: "approve" | "reject") {
    if (!r) return;
    const text = note.trim();
    if (decision === "reject" && text.length < 5) {
      setNoteError("Tulis alasan penolakan (minimal 5 huruf) agar warga tahu cara memperbaikinya.");
      return;
    }
    const ok = await appConfirm(
      decision === "approve"
        ? { title: "Setujui permohonan?", description: `Permohonan ${r.requestNumber} akan disetujui dan warga diberi tahu. Surat belum otomatis terbit; gunakan "Setujui & terbitkan surat" bila ingin sekaligus membuatnya.`, confirmLabel: "Setujui" }
        : { title: "Tolak permohonan?", description: `Permohonan ${r.requestNumber} akan ditolak dan alasan Anda dikirim ke warga.`, confirmLabel: "Tolak", tone: "destructive" },
    );
    if (!ok) return;
    setBusy(decision);
    try {
      const res = await fetch("/api/mail-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, decision, note: text }),
      });
      if (!res.ok) {
        const msg = await readApiError(res, "Gagal menyimpan keputusan");
        toast.error(msg);
        if (res.status === 409) {
          onChanged();
          void load(r.id);
        }
        return;
      }
      toast.success(decision === "approve" ? "Permohonan disetujui" : "Permohonan ditolak");
      onChanged();
      onClose();
    } catch {
      toast.error("Tidak dapat terhubung ke server.");
    } finally {
      setBusy(null);
    }
  }

  const composeHref = detail?.template ? `/layanan-surat/buat?templateId=${detail.template.id}&permohonan=${r?.id}` : "/layanan-surat/buat";

  return (
    <Dialog open={id != null} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{r ? r.mailType : "Detail permohonan"}</DialogTitle>
          <DialogDescription>{r ? <>No. {r.requestNumber} · diajukan {formatDateTime(r.requestDate)}</> : "Memuat rincian permohonan…"}</DialogDescription>
        </DialogHeader>

        {loading && !detail ? (
          <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" aria-label="Memuat" /></div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-destructive">{error}</p>
            {id != null ? <Button variant="outline" className="mt-3" onClick={() => void load(id)}>Coba lagi</Button> : null}
          </div>
        ) : r ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={r.status} />
              <RtBadge row={r} />
              <Badge variant="secondary">{CHANNEL_LABEL[r.channel] ?? r.channel}</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Pemohon" value={r.name} />
              <Field label="NIK" value={r.nik} mono />
              <Field label="Telepon" value={detail?.resident?.phone || "—"} />
              <Field
                label="Alamat"
                value={detail?.resident ? `${detail.resident.address}${detail.resident.rt ? `, RT ${detail.resident.rt}` : ""}${detail.resident.rw ? `/RW ${detail.resident.rw}` : ""}` : "Tidak ada di data warga"}
              />
            </div>

            <div>
              <Label className="text-muted-foreground">Keperluan (tulisan warga)</Label>
              <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">{r.purpose}</p>
              {detail?.formNote ? <p className="mt-2 text-sm"><span className="text-muted-foreground">Catatan tambahan: </span>{detail.formNote}</p> : null}
            </div>

            {r.rtNote ? <Field label={`Catatan ${r.rtLabel ?? "RT"}`} value={r.rtNote} /> : null}

            {/* Pemeriksaan otomatis (server) */}
            {pending && r.checks ? (
              <section aria-labelledby="chk-title" className="rounded-lg border p-4">
                <h3 id="chk-title" className="mb-2 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4" aria-hidden /> Pemeriksaan otomatis</h3>
                {r.checks.blocking.length === 0 && r.checks.warnings.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 className="h-4 w-4" aria-hidden /> Lolos semua pemeriksaan: NIK valid, warga terdata dan aktif, tidak ada permohonan ganda.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {r.checks.blocking.map((t) => <li key={t} className="flex items-start gap-2 text-red-700"><XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {t}</li>)}
                    {r.checks.warnings.map((t) => <li key={t} className="flex items-start gap-2 text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {t}</li>)}
                  </ul>
                )}
              </section>
            ) : null}

            {/* Asisten AI */}
            {pending && ready && canDecide ? (
              <AssistPanel requestId={r.id} onUseApprovalNote={(t) => { setNote(t); setNoteError(null); }} onUseRejectReason={(t) => { setNote(t); setNoteError(null); }} />
            ) : null}

            {/* Keputusan */}
            {pending ? (
              canDecide ? (
                <section aria-labelledby="dec-title" className="space-y-3 rounded-lg border p-4">
                  <h3 id="dec-title" className="text-sm font-semibold">Keputusan</h3>
                  {!ready ? (
                    <p className="text-sm text-amber-800">{r.checks?.blocking.join(" ") || "Permohonan belum bisa diputuskan."}</p>
                  ) : null}
                  {ready || rtRejected ? (
                    <>
                      <div>
                        <Label htmlFor="decision-note">Catatan untuk warga <span className="font-normal text-muted-foreground">(wajib bila menolak)</span></Label>
                        <Textarea
                          id="decision-note"
                          value={note}
                          maxLength={500}
                          rows={3}
                          className="mt-1"
                          aria-invalid={!!noteError}
                          aria-describedby={noteError ? "decision-note-err" : undefined}
                          placeholder="Mis. Surat dapat diambil di kantor desa pada jam kerja, atau alasan penolakan beserta cara memperbaikinya."
                          onChange={(e) => { setNote(e.target.value); setNoteError(null); }}
                        />
                        {noteError ? <p id="decision-note-err" role="alert" className="mt-1 text-sm text-destructive">{noteError}</p> : null}
                        <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">{note.length}/500</p>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="outline" className="gap-2 border-red-300 text-red-700 hover:bg-red-50" disabled={busy != null} onClick={() => void decide("reject")}>
                          {busy === "reject" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <XCircle className="h-4 w-4" aria-hidden />} Tolak
                        </Button>
                        {ready ? (
                          <>
                            <Button variant="outline" className="gap-2" disabled={busy != null} onClick={() => void decide("approve")}>
                              {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />} Setujui saja
                            </Button>
                            <Button asChild className="gap-2" disabled={busy != null}>
                              <Link href={composeHref}><FileText className="h-4 w-4" aria-hidden /> Setujui &amp; terbitkan surat</Link>
                            </Button>
                          </>
                        ) : null}
                      </div>
                      {rtRejected ? <p className="text-xs text-muted-foreground">Ketua RT menolak pengantar ini, sehingga permohonan hanya bisa ditolak.</p> : null}
                    </>
                  ) : null}
                </section>
              ) : (
                <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">Peran Anda hanya dapat melihat permohonan ini. Keputusan dilakukan oleh admin, sekretaris, atau staf.</p>
              )
            ) : (
              <section className="space-y-2 rounded-lg border p-4 text-sm">
                <h3 className="font-semibold">Hasil</h3>
                <p>{r.status === "SELESAI" ? "Disetujui" : "Ditolak"}{r.processedDate ? ` pada ${formatDateTime(r.processedDate)}` : ""}.</p>
                {(r.rejectionReason || r.notes) ? <p className="text-muted-foreground">Catatan: {r.rejectionReason || r.notes}</p> : null}
                {r.status === "SELESAI" ? (
                  detail?.letter ? (
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <Link href={`/layanan-surat/buat?surat=${detail.letter.id}`}><Printer className="h-4 w-4" aria-hidden /> Buka surat {detail.letter.letterNumber}</Link>
                    </Button>
                  ) : canDecide ? (
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <Link href={composeHref}><FileText className="h-4 w-4" aria-hidden /> Terbitkan surat</Link>
                    </Button>
                  ) : null
                ) : null}
              </section>
            )}

            {detail && detail.history.length > 0 ? (
              <section aria-labelledby="hist-title">
                <h3 id="hist-title" className="mb-2 flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" aria-hidden /> Permohonan lain dari pemohon ini</h3>
                <ul className="divide-y rounded-md border text-sm">
                  {detail.history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <span>{h.mailType} <span className="font-mono text-xs text-muted-foreground">{h.requestNumber}</span></span>
                      <span className="text-xs text-muted-foreground">{HISTORY_LABEL[h.status] ?? h.status} · {new Date(h.requestDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <Label className="text-muted-foreground">{label}</Label>
      <p className={`mt-0.5 text-sm ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
