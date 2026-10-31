"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Loader2, Sparkles, Users } from "lucide-react";
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

type Info = { enabled: true; pending: number } | { enabled: false; canActivate: boolean };

/**
 * Pintu masuk ke Buku Mutasi dan Keluarga/Wilayah. Bila fitur belum aktif, admin desa bisa mengaktifkannya dengan satu klik
 * (tanpa skrip). Diam saat gagal memuat agar tidak mengganggu halaman utama.
 */
export function KependudukanNav() {
  const [info, setInfo] = useState<Info | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((signal?: AbortSignal) => {
    return fetch("/api/kependudukan/status", { cache: "no-store", signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j) return setInfo(null);
        setInfo(j.enabled ? { enabled: true, pending: Number(j.pendingMutations) || 0 } : { enabled: false, canActivate: Boolean(j.canActivate) });
      })
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setInfo(null);
      });
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/kependudukan/aktivasi", { method: "POST" });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof j?.error === "string" ? j.error : "Gagal mengaktifkan fitur. Coba lagi.");
      toast.success(`Fitur aktif. ${j.households} keluarga dan ${j.wilayahUnits} dusun/RW/RT tersusun.`);
      setConfirm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengaktifkan fitur. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  if (!info) return null;

  if (!info.enabled) {
    if (!info.canActivate) return null;
    return (
      <>
        <section aria-label="Aktifkan fitur keluarga dan buku mutasi" className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <Sparkles aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="text-sm">
              <span className="font-semibold">Fitur baru: Daftar Keluarga, Wilayah, dan Buku Mutasi.</span> Catat kelahiran, kematian, pindah, dan datang dengan persetujuan
              pejabat desa, serta rekap bulanannya.
            </p>
          </div>
          <Button type="button" className="min-h-11 shrink-0" onClick={() => setConfirm(true)}>
            Aktifkan
          </Button>
        </section>

        <AlertDialog open={confirm} onOpenChange={(o) => (busy ? undefined : setConfirm(o))}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Aktifkan fitur ini untuk desa Anda?</AlertDialogTitle>
              <AlertDialogDescription>
                Sistem akan mengelompokkan warga menjadi keluarga menurut nomor KK, dan menyusun daftar dusun, RW, dan RT dari Data Warga. Data warga tidak diubah dan prosesnya hanya
                beberapa detik. Setelah itu, perubahan Data Warga ikut tercatat otomatis.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {error ? (
              <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-11" disabled={busy}>
                Nanti saja
              </AlertDialogCancel>
              <Button type="button" className="min-h-11" disabled={busy} onClick={() => void activate()}>
                {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                {busy ? "Menyusun data…" : "Ya, aktifkan"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <nav aria-label="Kependudukan lanjutan" className="flex flex-wrap gap-2">
      <Button asChild variant="outline" className="min-h-11">
        <Link href="/data-warga/mutasi">
          <BookOpen aria-hidden="true" />
          Buku Mutasi{info.pending > 0 ? ` (${info.pending} menunggu)` : ""}
        </Link>
      </Button>
      <Button asChild variant="outline" className="min-h-11">
        <Link href="/data-warga/keluarga">
          <Users aria-hidden="true" />
          Keluarga dan Wilayah
        </Link>
      </Button>
    </nav>
  );
}
