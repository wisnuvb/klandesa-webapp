"use client";

import { useId, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Flag, Loader2, MessageCircle, MessageSquareReply, Scale, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiJson, formatWib } from "@/components/admin/security/api";
import {
  FLAG_REASONS,
  FLAG_REASON_LABELS,
  LIMITS,
  PROGRESS_LABELS,
  REPLY_KINDS,
  REPLY_KIND_LABELS,
  categoryLabel,
  type AspirationProgress,
  type FlagReason,
  type ReplyKind,
} from "@/lib/aspirasi/catalog";
import { publicPath, type VillageAspiration } from "./types";

export const PROGRESS_ICONS: Record<AspirationProgress, LucideIcon> = {
  NEW: Clock,
  RESPONDED: MessageCircle,
  IN_PROGRESS: Loader2,
  RESOLVED: CheckCircle2,
  DISPUTED: Scale,
};

const PROGRESS_TONE: Record<AspirationProgress, string> = {
  NEW: "border-amber-500/60 text-amber-900 dark:text-amber-200",
  RESPONDED: "border-sky-600/50 text-sky-900 dark:text-sky-200",
  IN_PROGRESS: "border-sky-600/50 text-sky-900 dark:text-sky-200",
  RESOLVED: "border-emerald-600/50 text-emerald-900 dark:text-emerald-200",
  DISPUTED: "border-violet-600/50 text-violet-900 dark:text-violet-200",
};

export function ProgressBadge({ progress }: { progress: AspirationProgress }) {
  const Icon = PROGRESS_ICONS[progress];
  return (
    <Badge variant="outline" className={`gap-1 ${PROGRESS_TONE[progress]}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {PROGRESS_LABELS[progress]}
    </Badge>
  );
}

const KIND_HELP: Record<ReplyKind, string> = {
  RESPONSE: "Jawaban awal atau penjelasan desa atas laporan.",
  PROGRESS: "Kabar bahwa laporan sedang ditangani. Status berubah menjadi Sedang diproses.",
  RESOLVED: "Masalah sudah selesai ditangani. Status berubah menjadi Selesai.",
  DISPUTE: "Sanggahan = banding: desa menyatakan laporan keliru atau tidak sesuai kenyataan. Tampil publik berdampingan dengan laporan.",
};

type Props = {
  item: VillageAspiration;
  villageName: string;
  canReply: boolean;
  canDelete: boolean;
  onChanged: () => void;
};

export function AspirationCard({ item, villageName, canReply, canDelete, onChanged }: Props) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    setRemoving(id);
    setError(null);
    try {
      await apiJson(`/api/aspirasi-publik/replies/${id}`, { method: "DELETE" });
      setConfirmId(null);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus tanggapan.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <li className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <h3 className="break-words text-base font-semibold">{item.title}</h3>
          <p className="text-xs text-muted-foreground">
            {categoryLabel(item.category)} · tayang {formatWib(item.publishedAt)}
            {item.locationNote ? ` · ${item.locationNote}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProgressBadge progress={item.progress} />
          {item.openFlags > 0 ? (
            <Badge variant="outline" className="gap-1">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              Sedang ditinjau tim Klandesa
            </Badge>
          ) : null}
        </div>
      </div>

      <p className="mt-3 whitespace-pre-line break-words text-sm">{item.body}</p>

      {item.photos.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Foto laporan">
          {item.photos.map((src, i) => (
            <li key={src}>
              <a href={src} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Foto laporan ${i + 1} dari ${item.photos.length}`} loading="lazy" className="h-20 w-20 object-cover" />
              </a>
            </li>
          ))}
        </ul>
      ) : null}

      {item.replies.length > 0 ? (
        <ol className="mt-4 space-y-2 border-l-2 pl-3" aria-label="Tanggapan desa">
          {item.replies.map((r) => (
            <li key={r.id} className="rounded-md bg-muted/50 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{REPLY_KIND_LABELS[r.kind]}</span> · {r.authorLabel} · {formatWib(r.createdAt)}
                </p>
                {r.mine && canDelete ? (
                  <Button variant="ghost" size="sm" className="min-h-9 text-destructive" onClick={() => setConfirmId(r.id)} aria-label={`Hapus ${REPLY_KIND_LABELS[r.kind].toLowerCase()} ini`}>
                    <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
                    Hapus
                  </Button>
                ) : null}
              </div>
              <p className="mt-1 whitespace-pre-line break-words">{r.body}</p>
            </li>
          ))}
        </ol>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {canReply ? (
          <Button className="min-h-11" onClick={() => setReplyOpen(true)}>
            <MessageSquareReply className="mr-2 h-4 w-4" aria-hidden="true" />
            Tanggapi
          </Button>
        ) : null}
        <Button asChild variant="outline" className="min-h-11">
          <a href={publicPath(item)} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
            Lihat halaman publik
          </a>
        </Button>
        {canReply ? (
          <Button variant="outline" className="min-h-11" onClick={() => setFlagOpen(true)}>
            <Flag className="mr-2 h-4 w-4" aria-hidden="true" />
            Ajukan keberatan
          </Button>
        ) : null}
      </div>

      <ReplyDialog open={replyOpen} onOpenChange={setReplyOpen} code={item.code} title={item.title} villageName={villageName} onDone={onChanged} />
      <FlagDialog open={flagOpen} onOpenChange={setFlagOpen} code={item.code} title={item.title} onDone={onChanged} />

      <Dialog open={confirmId !== null} onOpenChange={(o) => (!o ? setConfirmId(null) : undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus tanggapan ini?</DialogTitle>
            <DialogDescription>Tanggapan akan hilang dari halaman publik. Status tindak lanjut laporan dihitung ulang dari tanggapan yang tersisa.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="min-h-11" onClick={() => setConfirmId(null)}>
              Batal
            </Button>
            <Button variant="destructive" className="min-h-11" disabled={removing !== null} onClick={() => confirmId && void remove(confirmId)}>
              {removing ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
              Hapus tanggapan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}

function ReplyDialog({ open, onOpenChange, code, title, villageName, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; code: string; title: string; villageName: string; onDone: () => void }) {
  const ids = { body: useId(), kind: useId() };
  const [kind, setKind] = useState<ReplyKind>("RESPONSE");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (text.length < LIMITS.replyMin) {
      setError(`Tanggapan terlalu pendek (minimal ${LIMITS.replyMin} karakter).`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await apiJson(`/api/aspirasi-publik/${code}/reply`, { method: "POST", body: { kind, body: text } });
      setBody("");
      setKind("RESPONSE");
      onOpenChange(false);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan tanggapan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>Tanggapi laporan</DialogTitle>
            <DialogDescription className="break-words">{title}</DialogDescription>
          </DialogHeader>
          <p className="rounded-md border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
            Tanggapan Anda tampil publik atas nama <strong>Pemerintah Desa {villageName}</strong> dan dapat dibaca siapa saja, termasuk mesin pencari. Jangan menulis data pribadi warga.
          </p>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Jenis tanggapan</legend>
            {REPLY_KINDS.map((k) => (
              <label key={k} htmlFor={`${ids.kind}-${k}`} className={`flex min-h-11 cursor-pointer gap-3 rounded-md border p-3 ${kind === k ? "border-primary bg-primary/5" : ""}`}>
                <input id={`${ids.kind}-${k}`} type="radio" name={ids.kind} value={k} checked={kind === k} onChange={() => setKind(k)} className="mt-1 h-4 w-4 shrink-0" />
                <span className="text-sm">
                  <span className="block font-medium">{REPLY_KIND_LABELS[k]}</span>
                  <span className="text-muted-foreground">{KIND_HELP[k]}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor={ids.body}>Isi tanggapan</Label>
            <Textarea id={ids.body} value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={LIMITS.replyMax} required aria-describedby={`${ids.body}-h`} />
            <p id={`${ids.body}-h`} className="text-xs text-muted-foreground">
              {body.trim().length}/{LIMITS.replyMax} karakter (minimal {LIMITS.replyMin}).
            </p>
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" className="min-h-11" disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
              Kirim tanggapan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FlagDialog({ open, onOpenChange, code, title, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; code: string; title: string; onDone: () => void }) {
  const ids = { detail: useId(), reason: useId() };
  const [reason, setReason] = useState<FlagReason>("PERSONAL_DATA");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ hidden: boolean } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (reason === "OTHER" && detail.trim().length < 10) {
      setError("Jelaskan alasannya (minimal 10 karakter).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await apiJson<{ hidden: boolean }>(`/api/aspirasi-publik/${code}/flag`, { method: "POST", body: { reason, detail } });
      setDone({ hidden: r.hidden });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengajukan keberatan.");
    } finally {
      setBusy(false);
    }
  }

  function close(o: boolean) {
    if (!o) {
      setDone(null);
      setError(null);
      setDetail("");
    }
    onOpenChange(o);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {done ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Keberatan diterima</DialogTitle>
              <DialogDescription>
                {done.hidden ? "Laporan disembunyikan sementara dari halaman publik sampai tim Klandesa selesai meninjau." : "Tim Klandesa akan meninjau keberatan Anda. Laporan tetap tampil selama peninjauan, tetapi tidak diindeks mesin pencari."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button className="min-h-11" onClick={() => close(false)}>
                Tutup
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <DialogHeader>
              <DialogTitle>Ajukan keberatan</DialogTitle>
              <DialogDescription className="break-words">{title}</DialogDescription>
            </DialogHeader>
            <p className="rounded-md border p-3 text-sm text-muted-foreground">
              Bila laporan memuat <strong className="text-foreground">data pribadi</strong>, laporan langsung disembunyikan sementara untuk ditinjau tim Klandesa. Alasan lain ditinjau tanpa menyembunyikan laporan; selama
              peninjauan laporan tidak diindeks mesin pencari. Untuk menyatakan laporan keliru secara terbuka, gunakan Tanggapi → Sanggahan.
            </p>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Alasan keberatan</legend>
              {FLAG_REASONS.map((r) => (
                <label key={r} htmlFor={`${ids.reason}-${r}`} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border p-3 text-sm ${reason === r ? "border-primary bg-primary/5" : ""}`}>
                  <input id={`${ids.reason}-${r}`} type="radio" name={ids.reason} value={r} checked={reason === r} onChange={() => setReason(r)} className="h-4 w-4 shrink-0" />
                  {FLAG_REASON_LABELS[r]}
                </label>
              ))}
            </fieldset>
            <div className="space-y-1.5">
              <Label htmlFor={ids.detail}>Penjelasan {reason === "OTHER" ? "" : "(opsional)"}</Label>
              <Textarea id={ids.detail} value={detail} onChange={(e) => setDetail(e.target.value)} rows={3} maxLength={LIMITS.flagDetailMax} />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => close(false)}>
                Batal
              </Button>
              <Button type="submit" className="min-h-11" disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
                Kirim keberatan
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
