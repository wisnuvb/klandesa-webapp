"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, ImagePlus, Loader2, RotateCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { parseKkText, type KkDraft } from "@/lib/kependudukan/kk-ocr/parse";
import { memberNotes } from "@/lib/kependudukan/kk-ocr/apply";
import { LOW_CONFIDENCE, MIN_USABLE_LONG_SIDE, openImage, recognizeKk, type ImageInfo, type OcrProgress, type Rotation } from "@/lib/kependudukan/kk-ocr/engine";

const MAX_BYTES = 15 * 1024 * 1024;

const STAGE_TEXT: Record<OcrProgress["stage"], string> = {
  image: "Menyiapkan gambar (meluruskan dan meratakan bayangan)…",
  engine: "Memuat mesin pembaca…",
  read: "Membaca tulisan pada KK…",
};

interface Result {
  draft: KkDraft;
  confidence: number;
  skew: number;
  seconds: number;
  lowRes: boolean;
}

export function KkOcrDialog({ open, onOpenChange, onApply }: { open: boolean; onOpenChange: (o: boolean) => void; onApply: (draft: KkDraft) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<ImageInfo | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = progress !== null;

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  function reset() {
    abortRef.current?.abort();
    setFile(null);
    setImage(null);
    setUrl(null);
    setRotation(0);
    setProgress(null);
    setResult(null);
    setError(null);
  }

  function close(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  async function pick(f: File | undefined) {
    if (!f) return;
    setError(null);
    setResult(null);
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setError("Gunakan foto berformat JPG, PNG, atau WebP.");
    if (f.size > MAX_BYTES) return setError("Ukuran foto terlalu besar (maksimal 15 MB).");
    try {
      const info = await openImage(f);
      setFile(f);
      setImage(info);
      setUrl(URL.createObjectURL(f));
      // KK dicetak mendatar; foto tegak hampir pasti perlu diputar.
      setRotation(info.height > info.width * 1.15 ? 90 : 0);
    } catch {
      setError("Foto tidak bisa dibuka. Coba foto lain.");
    }
  }

  async function read() {
    if (!image) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError(null);
    setResult(null);
    setProgress({ stage: "image", fraction: null });
    const t0 = Date.now();
    try {
      const r = await recognizeKk(image, rotation, setProgress, ctrl.signal);
      setResult({
        draft: parseKkText(r.lines),
        confidence: r.confidence,
        skew: r.skew,
        seconds: Math.round((Date.now() - t0) / 100) / 10,
        lowRes: Math.max(image.width, image.height) < MIN_USABLE_LONG_SIDE,
      });
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError("Gagal membaca foto. Muat ulang halaman lalu coba lagi, atau isi secara manual.");
    } finally {
      setProgress(null);
    }
  }

  const draft = result?.draft;
  const flagged = draft ? draft.members.filter((m) => Object.keys(m.flags).length > 0).length + Object.keys(draft.headerFlags).length : 0;
  const pct = progress?.stage === "read" && progress.fraction != null ? Math.round(progress.fraction * 100) : null;

  return (
    <Dialog open={open} onOpenChange={(o) => (busy ? undefined : close(o))}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Isi dari foto Kartu Keluarga</DialogTitle>
          <DialogDescription>
            Percobaan. Hasil bacaan hanya draf: setiap isian tetap Anda periksa sebelum disimpan.
          </DialogDescription>
        </DialogHeader>

        <p className="flex gap-2 rounded-md border bg-muted/40 p-3 text-sm">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <span>Foto dibaca langsung di perangkat ini. Foto tidak dikirim ke server atau pihak lain, dan tidak disimpan.</span>
        </p>

        {error ? (
          <p role="alert" className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <section aria-label="Foto KK" className="space-y-3">
            {!url ? (
              <>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Foto seluruh KK dari atas, lurus, dan terang. Hindari pantulan lampu dan bayangan tangan.</li>
                  <li>Kedua tabel (anggota dan hubungan keluarga) harus terlihat utuh dan tajam.</li>
                  <li>Lebih dekat lebih baik, tetapi jangan ada bagian yang terpotong.</li>
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" className="min-h-11" onClick={() => cameraRef.current?.click()}>
                    <Camera aria-hidden="true" />
                    Ambil foto
                  </Button>
                  <Button type="button" variant="outline" className="min-h-11" onClick={() => fileRef.current?.click()}>
                    <ImagePlus aria-hidden="true" />
                    Pilih dari berkas
                  </Button>
                </div>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
              </>
            ) : (
              <>
                <div className="flex max-h-[46vh] items-center justify-center overflow-auto rounded-md border bg-muted/30 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal (blob), bukan aset situs */}
                  <img src={url} alt="Pratinjau foto KK yang akan dibaca" className="max-h-[44vh] max-w-full object-contain transition-transform" style={{ transform: `rotate(${rotation}deg)` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {file?.name} · {image?.width}×{image?.height} piksel
                </p>
                {image && Math.max(image.width, image.height) < MIN_USABLE_LONG_SIDE ? (
                  <p role="note" className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
                    <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    Resolusi foto rendah; hasil bacaan kemungkinan banyak salah. Ambil ulang lebih dekat.
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => setRotation((r) => (((r + 90) % 360) as Rotation))}>
                    <RotateCw aria-hidden="true" />
                    Putar 90°
                  </Button>
                  <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={reset}>
                    Ganti foto
                  </Button>
                  <Button type="button" className="min-h-11" disabled={busy} onClick={() => void read()}>
                    {busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}
                    {result ? "Baca ulang" : "Baca KK"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Pastikan tulisan pada pratinjau mendatar (terbaca dari kiri ke kanan). Bila miring ke samping, putar dulu.</p>
              </>
            )}
          </section>

          <section aria-label="Hasil bacaan" aria-live="polite" className="min-w-0 space-y-3">
            {busy && progress ? (
              <div className="space-y-2" role="status">
                <p className="text-sm">{STAGE_TEXT[progress.stage]}{pct != null ? ` ${pct}%` : ""}</p>
                <Progress value={pct ?? undefined} aria-label="Kemajuan membaca" className={pct == null ? "animate-pulse" : ""} />
                <p className="text-xs text-muted-foreground">Pertama kali bisa lebih lama karena mesin dimuat dulu.</p>
              </div>
            ) : null}

            {!busy && !draft ? <p className="text-sm text-muted-foreground">Hasil bacaan akan tampil di sini setelah foto dibaca.</p> : null}

            {draft && result ? (
              <div className="space-y-3">
                <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
                  <CheckCircle2 aria-hidden="true" className="size-4 text-emerald-600" />
                  Terbaca {draft.members.length} anggota{flagged ? `, ${flagged} bagian perlu diperiksa` : ""}.
                  <span className="font-normal text-muted-foreground">({result.seconds} dtk)</span>
                </p>
                {result.confidence < LOW_CONFIDENCE ? (
                  <p role="note" className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
                    <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    Foto kurang jelas (keyakinan {Math.round(result.confidence)}%). Periksa semua isian dengan teliti, atau ambil foto ulang.
                  </p>
                ) : null}

                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md border p-3 text-sm">
                  <dt className="text-muted-foreground">No. KK</dt>
                  <dd className="break-all font-mono">{draft.kk || "—"}</dd>
                  <dt className="text-muted-foreground">Alamat</dt>
                  <dd>{draft.address || "—"}{draft.rt || draft.rw ? ` · RT ${draft.rt || "-"}/RW ${draft.rw || "-"}` : ""}</dd>
                </dl>
                {Object.values(draft.headerFlags).map((m) => (
                  <p key={m} className="flex gap-2 text-sm text-amber-900 dark:text-amber-200">
                    <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    {m}
                  </p>
                ))}

                <ul className="max-h-[34vh] space-y-2 overflow-y-auto pr-1">
                  {draft.members.map((m, i) => {
                    const notes = memberNotes(m);
                    return (
                      <li key={i} className="rounded-md border p-3 text-sm">
                        <p className="font-semibold">
                          {m.rowNo ?? i + 1}. {m.name || "(nama tidak terbaca)"} <span className="font-normal text-muted-foreground">· {m.familyRole || "hubungan ?"}</span>
                        </p>
                        <p className="font-mono text-xs">{m.nik}</p>
                        <p className="text-muted-foreground">
                          {[m.gender, m.birthplace, m.birthDate, m.religion].filter(Boolean).join(" · ") || "—"}
                        </p>
                        {notes.length ? (
                          <ul className="mt-1 space-y-0.5 text-amber-900 dark:text-amber-200">
                            {notes.map((n) => (
                              <li key={n} className="flex gap-1.5">
                                <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                                {n}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                {draft.notes.map((n) => (
                  <p key={n} role="note" className="flex gap-2 text-sm text-amber-900 dark:text-amber-200">
                    <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    {n}
                  </p>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" className="min-h-11" disabled={busy} onClick={() => close(false)}>
            Batal
          </Button>
          <Button
            type="button"
            className="min-h-11"
            disabled={busy || !draft || draft.members.length === 0}
            onClick={() => {
              if (!draft) return;
              onApply(draft);
              close(false);
            }}
          >
            Terapkan ke formulir{draft ? ` (${draft.members.length} anggota)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
