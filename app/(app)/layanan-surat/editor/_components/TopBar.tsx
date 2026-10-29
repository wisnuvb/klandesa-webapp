"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Check, CloudOff, Loader2, Lock, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { PersistStatus } from "../_utils/persist";

type StatusProps = {
  status: PersistStatus;
  invalidCount?: number;
  lastSavedAt?: Date | null;
  message?: string | null;
  onRetry?: () => void;
};

const jam = (d: Date) => d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

/** Status simpan: teks + ikon (tidak hanya warna), diumumkan sopan ke pembaca layar. */
export function SaveStatus({ status, invalidCount = 0, lastSavedAt, message, onRetry }: StatusProps) {
  let icon: ReactNode = null;
  let text = "";
  let tone = "text-muted-foreground";
  switch (status) {
    case "loading":
      icon = <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />;
      text = "Memuat…";
      break;
    case "saving":
      icon = <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />;
      text = "Menyimpan…";
      break;
    case "saved":
      icon = <Check className="h-4 w-4" aria-hidden />;
      text = lastSavedAt ? `Tersimpan • ${jam(lastSavedAt)}` : "Tersimpan";
      tone = "text-foreground";
      break;
    case "ready":
      text = "Disimpan otomatis";
      break;
    case "invalid":
      icon = <AlertTriangle className="h-4 w-4" aria-hidden />;
      text = `Perlu diperbaiki (${invalidCount})`;
      tone = "text-destructive";
      break;
    case "error":
      icon = <CloudOff className="h-4 w-4" aria-hidden />;
      text = "Gagal menyimpan";
      tone = "text-destructive";
      break;
    case "conflict":
      icon = <RefreshCw className="h-4 w-4" aria-hidden />;
      text = "Diubah di tempat lain";
      tone = "text-destructive";
      break;
    case "unsupported":
    case "needsFork":
      icon = <Lock className="h-4 w-4" aria-hidden />;
      text = "Tidak bisa diubah";
      break;
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      <div role="status" aria-live="polite" className={`flex items-center gap-1.5 ${tone}`}>
        {icon}
        <span>{text}</span>
        {status === "error" && message && <span className="sr-only">{message}</span>}
      </div>
      {status === "error" && onRetry && (
        <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={onRetry}>Coba lagi</Button>
      )}
    </div>
  );
}

type TopBarProps = StatusProps & {
  name: string;
  /** Dipanggil saat nama diubah dan disetujui (Enter/keluar kolom). */
  onNameChange: (name: string) => void;
  backHref?: string;
  /** Tombol tambahan di tengah/kanan (undo/redo/pratinjau). */
  children?: ReactNode;
  onDone?: () => void;
  doneLabel?: string;
  nameDisabled?: boolean;
};

/** Bilah atas editor: kembali, nama yang bisa diubah di tempat, status simpan, aksi, Selesai. */
export function TopBar({
  name, onNameChange, backHref = "/layanan-surat", children, onDone, doneLabel = "Selesai", nameDisabled, ...status
}: TopBarProps) {
  const nameId = useId();
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    const next = (draft ?? name).trim();
    if (draft !== null && next !== "" && next !== name) onNameChange(next.slice(0, 255));
    setDraft(null); // nama kosong dikembalikan ke nama sebelumnya
  };

  return (
    <header className="flex flex-wrap items-center gap-3 border-b bg-background px-4 py-2">
      <Button asChild variant="ghost" size="sm" className="min-h-11 gap-2">
        <Link href={backHref}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Kembali
        </Link>
      </Button>

      <div className="min-w-48 flex-1">
        <label htmlFor={nameId} className="sr-only">Nama jenis surat</label>
        <input
          id={nameId}
          value={draft ?? name}
          disabled={nameDisabled}
          maxLength={255}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setDraft(null);
              e.currentTarget.blur();
            }
          }}
          placeholder="Nama jenis surat"
          className="h-11 w-full truncate rounded-md border border-transparent bg-transparent px-2 text-base font-semibold hover:border-input focus-visible:border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        />
      </div>

      {children && <div className="flex items-center gap-1">{children}</div>}
      <SaveStatus {...status} />
      {onDone && (
        <Button type="button" className="min-h-11" onClick={onDone}>{doneLabel}</Button>
      )}
    </header>
  );
}

/** Spanduk konflik: operator memilih muat ulang (buang versi saya) atau timpa (pakai versi saya). */
export function ConflictBanner({ onReload, onOverwrite, busy }: { onReload: () => void; onOverwrite: () => void; busy?: boolean }) {
  return (
    <Alert variant="destructive" className="mx-4 mt-3 w-auto">
      <AlertTriangle aria-hidden />
      <AlertTitle>Jenis surat ini sudah diubah di tempat lain</AlertTitle>
      <AlertDescription>
        <p>Penyimpanan otomatis dihentikan supaya perubahan orang lain tidak tertimpa. Pilih salah satu:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={onReload}>
            Muat ulang versi terbaru
          </Button>
          <Button type="button" variant="destructive" className="min-h-11" disabled={busy} onClick={onOverwrite}>
            Simpan versi saya (menimpa)
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/** Spanduk untuk template yang tidak bisa dibuka: format lama/rusak, atau contoh bawaan yang perlu disalin dulu. */
export function NoticeBanner({
  kind, message, onFork, backHref = "/layanan-surat",
}: { kind: "unsupported" | "needsFork"; message: string | null; onFork?: () => void; backHref?: string }) {
  return (
    <Alert className="mx-4 mt-3 w-auto">
      <Lock aria-hidden />
      <AlertTitle>{kind === "needsFork" ? "Salin dulu untuk mengubah" : "Jenis surat ini tidak bisa dibuka"}</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {kind === "needsFork" && onFork && (
            <Button type="button" className="min-h-11" onClick={onFork}>Salin ke desa saya</Button>
          )}
          <Button asChild variant="outline" className="min-h-11">
            <Link href={backHref}>Kembali ke daftar</Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
