"use client";

import { useId, useRef, useState } from "react";
import { ChevronDown, FileText, ImageIcon, Loader2, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDialogsSafe } from "@/components/providers/AppDialogProvider";
import { ATTACHMENT_ACCEPT, type AttachmentEntityType } from "@/lib/attachments/catalog";
import { attachmentFileUrl } from "@/lib/attachments/client";
import { formatBytes } from "@/lib/digitalArchive/media";
import { useAttachments, type AttachmentsApi } from "./useAttachments";

const isImage = (name: string | null) => !!name && /\.(jpe?g|png|webp|gif)$/i.test(name);

/**
 * Bagian "Lampiran" untuk form rekaman. Berkas disimpan di Arsip Digital (privat); ukurannya ikut dihitung
 * dalam penyimpanan desa. Dipakai bersama semua modul: hubungkan dengan `useAttachments(jenis, idRekaman | null)`.
 */
export function AttachmentsSection({ att, title = "Lampiran", hint, readOnly = false }: { att: AttachmentsApi; title?: string; hint?: string; readOnly?: boolean }) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { appConfirm } = useAppDialogsSafe();
  const editable = !readOnly && (att.canEdit || !att.live);
  const count = att.live ? att.items.length : att.queue.length;
  const busy = att.uploads.some((u) => !u.error);

  async function onRemove(id: number, name: string) {
    const ok = await appConfirm({
      title: "Lepas lampiran ini?",
      description: `"${name}" hanya dilepas dari catatan ini. Berkasnya tetap tersimpan di Arsip Digital.`,
      confirmLabel: "Lepas",
      tone: "destructive",
    });
    if (ok) await att.removeItem(id);
  }

  return (
    <section aria-labelledby={`${inputId}-title`} className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id={`${inputId}-title`} className="text-sm font-semibold">
            {title}
            {count > 0 ? <span className="ml-2 font-normal text-muted-foreground">({count})</span> : null}
          </h3>
          <p className="text-sm text-muted-foreground">{hint ?? "Pindai atau foto dokumen aslinya. PDF, foto, Word, atau Excel, maksimal 200 MB per berkas. Disimpan di Arsip Digital."}</p>
        </div>
        {editable ? (
          <>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              multiple
              accept={ATTACHMENT_ACCEPT}
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                if (e.target.files?.length) void att.addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => inputRef.current?.click()}>
              {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Paperclip aria-hidden="true" />}
              {busy ? "Mengunggah…" : "Tambah berkas"}
            </Button>
          </>
        ) : null}
      </div>

      {att.rejected.length ? (
        <ul role="alert" className="space-y-1 text-sm text-destructive">
          {att.rejected.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      ) : null}

      {att.loadError ? (
        <p role="alert" className="text-sm text-destructive">
          {att.loadError}{" "}
          <button type="button" className="underline" onClick={() => void att.reload()}>
            Coba lagi
          </button>
        </p>
      ) : null}
      {att.actionError ? (
        <p role="alert" className="text-sm text-destructive">
          {att.actionError}
        </p>
      ) : null}

      <ul className="space-y-2">
        {att.uploads.map((u) => (
          <li key={u.key} className="rounded-md border border-dashed p-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate">{u.name}</span>
              {u.error ? (
                <button type="button" aria-label={`Tutup pesan galat ${u.name}`} className="shrink-0 rounded p-2 hover:bg-muted" onClick={() => att.dismissUpload(u.key)}>
                  <X aria-hidden="true" className="size-4" />
                </button>
              ) : (
                <span className="shrink-0 tabular-nums text-muted-foreground">{u.progress}%</span>
              )}
            </div>
            {u.error ? (
              <p role="alert" className="mt-1 text-destructive">
                {u.error}
              </p>
            ) : (
              <div className="mt-1 h-1.5 overflow-hidden rounded bg-muted" role="progressbar" aria-label={`Mengunggah ${u.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={u.progress}>
                <div className="h-full bg-primary transition-[width]" style={{ width: `${u.progress}%` }} />
              </div>
            )}
          </li>
        ))}

        {!att.live
          ? att.queue.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  {isImage(f.name) ? <ImageIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /> : <FileText aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />}
                  <span className="truncate">{f.name}</span>
                  <span className="shrink-0 text-muted-foreground">{formatBytes(f.size)}</span>
                </span>
                <button type="button" aria-label={`Batalkan ${f.name}`} className="shrink-0 rounded p-2 hover:bg-muted" onClick={() => att.removeQueued(i)}>
                  <X aria-hidden="true" className="size-4" />
                </button>
              </li>
            ))
          : att.items.map((it) => {
              const name = it.fileName ?? it.label;
              return (
                <li key={it.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    {isImage(it.fileName) ? <ImageIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /> : <FileText aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />}
                    {it.missing ? (
                      <span className="min-w-0 truncate text-muted-foreground">
                        {it.label} <span className="text-destructive">(berkas sudah dihapus dari Arsip Digital)</span>
                      </span>
                    ) : (
                      <a href={attachmentFileUrl(it.id)} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate font-medium underline-offset-2 hover:underline">
                        {name}
                      </a>
                    )}
                    {it.fileSize ? <span className="shrink-0 text-muted-foreground">{formatBytes(it.fileSize)}</span> : null}
                  </span>
                  {editable ? (
                    <button type="button" aria-label={`Lepas lampiran ${name}`} className="shrink-0 rounded p-2 hover:bg-muted" onClick={() => void onRemove(it.id, name)}>
                      <X aria-hidden="true" className="size-4" />
                    </button>
                  ) : null}
                </li>
              );
            })}
      </ul>

      {att.live && att.loading ? <p className="text-sm text-muted-foreground">Memuat lampiran…</p> : null}
      {!att.loading && !att.loadError && count === 0 && att.uploads.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada lampiran.</p> : null}
      {!att.live && att.queue.length > 0 ? <p className="text-sm text-muted-foreground">Berkas diunggah setelah data disimpan.</p> : null}
    </section>
  );
}

/**
 * Lampiran untuk rekaman yang sudah ada, dipasang di dalam dialog/halaman detail. Memuat daftar hanya saat komponen ini
 * dirender (mis. saat dialog terbuka), jadi aman diletakkan di komponen yang selalu terpasang.
 */
export function LiveAttachments({ type, id, title, hint, readOnly }: { type: AttachmentEntityType; id: number; title?: string; hint?: string; readOnly?: boolean }) {
  const att = useAttachments(type, id);
  return <AttachmentsSection att={att} title={title} hint={hint} readOnly={readOnly} />;
}

/**
 * Penanda "N lampiran" pada baris daftar; menekannya membuka daftar berkas (baca-saja) langsung di baris itu.
 * Tidak menampilkan apa pun bila rekaman belum punya lampiran. Menambah/melepas dilakukan dari form ubah.
 */
export function AttachmentToggle({ type, id, count }: { type: AttachmentEntityType; id: number | string; count: number }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  if (count <= 0) return null;
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Paperclip aria-hidden="true" className="size-4" />
        {count} lampiran
        <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div id={panelId} className="pt-2">
          <LiveAttachments type={type} id={Number(id)} title="Lampiran" readOnly />
        </div>
      ) : null}
    </div>
  );
}

/** Penanda ringkas jumlah lampiran (tidak interaktif) untuk tempat yang sudah berupa tautan/tabel. */
export function AttachmentCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" role="img" aria-label={`${count} lampiran`} title={`${count} lampiran`}>
      <Paperclip aria-hidden="true" className="size-3.5" />
      {count}
    </span>
  );
}

/**
 * Lampiran yang dibuka-tutup di dalam kartu/baris (bisa menambah dan melepas sesuai izin). Dipakai di daftar yang
 * barisnya sudah penuh isi. `id` null = rekaman tunggal yang belum pernah disimpan, jadi belum bisa dilampiri.
 */
export function AttachmentDisclosure({ type, id, title = "Lampiran", hint, count, readOnly }: { type: AttachmentEntityType; id: number | string | null; title?: string; hint?: string; count?: number; readOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  if (id === null) return <p className="text-sm text-muted-foreground">Simpan datanya terlebih dahulu untuk menambahkan lampiran.</p>;
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Paperclip aria-hidden="true" className="size-4" />
        {title}
        {count && count > 0 ? ` (${count})` : ""}
        <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div id={panelId} className="pt-2">
          <LiveAttachments type={type} id={Number(id)} title={title} hint={hint} readOnly={readOnly} />
        </div>
      ) : null}
    </div>
  );
}
