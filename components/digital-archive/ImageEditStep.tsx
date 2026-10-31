"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/components/ui/utils";
import { MAX_MEDIA_IMAGE_BYTES, formatBytes, normalizeMime } from "@/lib/digitalArchive/media";
import { baseCropSize, cropRect, frameSize, processImage } from "@/lib/digitalArchive/image-edit";

type AspectKey = "asli" | "1:1" | "4:3" | "16:9";
const ASPECTS: Array<{ key: AspectKey; label: string; ratio: number | null }> = [
  { key: "asli", label: "Asli", ratio: null },
  { key: "1:1", label: "1:1", ratio: 1 },
  { key: "4:3", label: "4:3", ratio: 4 / 3 },
  { key: "16:9", label: "16:9", ratio: 16 / 9 },
];

const MAX_DIMS: Array<{ key: string; label: string; value: number | null }> = [
  { key: "800", label: "800 px", value: 800 },
  { key: "1280", label: "1280 px", value: 1280 },
  { key: "1920", label: "1920 px", value: 1920 },
  { key: "asli", label: "Asli", value: null },
];

const MAX_ZOOM = 4;
const FRAME_MAX_HEIGHT = 300;

export type ImageEditStepProps = {
  file: File;
  /** Mis. "Gambar 2 dari 3" saat mengunggah beberapa berkas. */
  progressLabel?: string;
  /** Sedang mengunggah hasil. */
  busy: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

/** Langkah potong + kompres sebelum gambar diunggah. Berkas asli dikirim apa adanya bila tidak diubah. */
export function ImageEditStep({ file, progressLabel, busy, error, onCancel, onConfirm }: ImageEditStepProps) {
  // GIF bisa beranimasi: canvas hanya menyimpan satu frame, jadi GIF diunggah apa adanya.
  const editable = normalizeMime(file.type) !== "image/gif";

  const [url, setUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const [aspectKey, setAspectKey] = useState<AspectKey>("asli");
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<{ cx: number; cy: number } | null>(null);

  const [compress, setCompress] = useState(editable && file.size > 500 * 1024);
  const [quality, setQuality] = useState(0.8);
  const [maxDimKey, setMaxDimKey] = useState("1920");
  const maxDim = MAX_DIMS.find((d) => d.key === maxDimKey)?.value ?? null;

  const [prepared, setPrepared] = useState<{ file: File; width: number; height: number } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const [availW, setAvailW] = useState(480);

  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setAvailW(Math.max(160, el.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const aspect = ASPECTS.find((a) => a.key === aspectKey)?.ratio ?? null;
  const imgW = natural?.w ?? 0;
  const imgH = natural?.h ?? 0;

  const rect = useMemo(() => {
    if (!natural) return null;
    return cropRect({
      imgW,
      imgH,
      aspect,
      zoom,
      cx: center?.cx ?? imgW / 2,
      cy: center?.cy ?? imgH / 2,
    });
  }, [natural, imgW, imgH, aspect, zoom, center]);

  const frameAspect = useMemo(() => {
    if (!natural) return 1;
    const base = baseCropSize(imgW, imgH, aspect);
    return base.w / base.h;
  }, [natural, imgW, imgH, aspect]);
  const frame = frameSize(availW, FRAME_MAX_HEIGHT, frameAspect);
  // Piksel layar per piksel gambar asli pada bingkai saat ini.
  const scale = rect ? frame.w / rect.w : 1;

  // Hasil olahan sungguhan (bukan perkiraan), ditunda sebentar agar tidak menghitung tiap gerakan slider.
  useEffect(() => {
    const img = imgRef.current;
    if (!natural || !rect || !img || loadFailed) return;
    let cancelled = false;
    setPreparing(true);
    const timer = setTimeout(async () => {
      try {
        const out = await processImage(img, file, {
          rect,
          compress: editable && compress,
          quality,
          maxDim,
        });
        if (cancelled) return;
        setPrepared(out);
        setProcessError(null);
      } catch (e) {
        if (cancelled) return;
        setPrepared(null);
        setProcessError(e instanceof Error ? e.message : "Gagal memproses gambar.");
      } finally {
        if (!cancelled) setPreparing(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [natural, rect, file, editable, compress, quality, maxDim, loadFailed]);

  const dragRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const moveBy = (dxImg: number, dyImg: number) => {
    if (!rect) return;
    setCenter({ cx: rect.x + rect.w / 2 + dxImg, cy: rect.y + rect.h / 2 + dyImg });
  };

  const resetCrop = () => {
    setZoom(1);
    setCenter(null);
  };

  const canPan = rect ? rect.w < imgW - 0.5 || rect.h < imgH - 0.5 : false;
  const sizeTooBig = prepared ? prepared.file.size > MAX_MEDIA_IMAGE_BYTES : false;
  const unchanged = prepared?.file === file;
  const canSubmit = Boolean(prepared) && !preparing && !busy && !sizeTooBig && !loadFailed;
  const shown = error ?? processError;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {progressLabel ? (
          <p className="mb-3 text-xs font-medium text-muted-foreground">{progressLabel}</p>
        ) : null}
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_16rem]">
          <div ref={stageRef} className="min-w-0 space-y-2">
            <div
              role="group"
              tabIndex={editable ? 0 : -1}
              aria-label={
                editable
                  ? "Area potong. Seret gambar atau gunakan tombol panah untuk menggeser."
                  : "Pratinjau gambar"
              }
              className="relative mx-auto select-none overflow-hidden rounded-lg border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{
                width: natural ? frame.w : "100%",
                height: natural ? frame.h : 200,
                touchAction: editable ? "none" : "auto",
                cursor: editable && canPan ? "grab" : "default",
              }}
              onPointerDown={(e) => {
                if (!editable || !rect) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                dragRef.current = {
                  x: e.clientX,
                  y: e.clientY,
                  cx: rect.x + rect.w / 2,
                  cy: rect.y + rect.h / 2,
                };
              }}
              onPointerMove={(e) => {
                const d = dragRef.current;
                if (!d) return;
                setCenter({
                  cx: d.cx - (e.clientX - d.x) / scale,
                  cy: d.cy - (e.clientY - d.y) / scale,
                });
              }}
              onPointerUp={() => {
                dragRef.current = null;
              }}
              onPointerCancel={() => {
                dragRef.current = null;
              }}
              onKeyDown={(e) => {
                if (!editable || !rect) return;
                const step = rect.w * (e.shiftKey ? 0.2 : 0.05);
                const stepY = rect.h * (e.shiftKey ? 0.2 : 0.05);
                if (e.key === "ArrowLeft") moveBy(-step, 0);
                else if (e.key === "ArrowRight") moveBy(step, 0);
                else if (e.key === "ArrowUp") moveBy(0, -stepY);
                else if (e.key === "ArrowDown") moveBy(0, stepY);
                else return;
                e.preventDefault();
              }}
            >
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  ref={imgRef}
                  src={url}
                  alt="Pratinjau gambar yang akan diunggah"
                  draggable={false}
                  className="pointer-events-none absolute left-0 top-0 max-w-none origin-top-left"
                  style={
                    natural && rect
                      ? {
                          width: imgW * scale,
                          height: imgH * scale,
                          transform: `translate(${-rect.x * scale}px, ${-rect.y * scale}px)`,
                        }
                      : { opacity: 0 }
                  }
                  onLoad={(e) => {
                    const t = e.currentTarget;
                    setNatural({ w: t.naturalWidth, h: t.naturalHeight });
                  }}
                  onError={() => setLoadFailed(true)}
                />
              ) : null}
              {!natural && !loadFailed ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  Memuat gambar…
                </div>
              ) : null}
              {loadFailed ? (
                <div role="alert" className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-destructive">
                  Gambar tidak dapat dibaca. Coba berkas lain.
                </div>
              ) : null}
              {editable && natural ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,transparent_33.2%,rgba(255,255,255,.55)_33.3%,transparent_33.5%,transparent_66.5%,rgba(255,255,255,.55)_66.6%,transparent_66.8%),linear-gradient(to_bottom,transparent_33.2%,rgba(255,255,255,.55)_33.3%,transparent_33.5%,transparent_66.5%,rgba(255,255,255,.55)_66.6%,transparent_66.8%)]"
                />
              ) : null}
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {editable
                ? "Seret gambar untuk menggeser area potong."
                : "GIF diunggah apa adanya agar animasinya tidak hilang."}
            </p>
          </div>

          {editable ? (
            <div className="space-y-5">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Potong</legend>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={aspectKey}
                  onValueChange={(v) => {
                    if (!v) return;
                    setAspectKey(v as AspectKey);
                    resetCrop();
                  }}
                  aria-label="Rasio potong"
                  className="flex-wrap"
                >
                  {ASPECTS.map((a) => (
                    <ToggleGroupItem key={a.key} value={a.key} aria-label={`Rasio ${a.label}`}>
                      {a.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <div className="space-y-1">
                  <Label htmlFor="img-zoom" className="flex justify-between text-xs font-normal text-muted-foreground">
                    <span>Perbesar</span>
                    <span className="tabular-nums">{Math.round(zoom * 100)}%</span>
                  </Label>
                  <input
                    id="img-zoom"
                    type="range"
                    min={1}
                    max={MAX_ZOOM}
                    step={0.05}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="h-6 w-full cursor-pointer accent-primary"
                  />
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={resetCrop} disabled={zoom === 1 && !center}>
                  <RotateCcw className="size-4" aria-hidden="true" />
                  Atur ulang posisi
                </Button>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="sr-only">Kompres</legend>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="img-compress" className="text-sm font-medium">
                    Kompres gambar
                  </Label>
                  <Switch id="img-compress" checked={compress} onCheckedChange={setCompress} />
                </div>
                <div className={cn("space-y-4", !compress && "pointer-events-none opacity-50")} aria-disabled={!compress}>
                  <div className="space-y-1">
                    <Label htmlFor="img-quality" className="flex justify-between text-xs font-normal text-muted-foreground">
                      <span>Kualitas</span>
                      <span className="tabular-nums">{Math.round(quality * 100)}%</span>
                    </Label>
                    <input
                      id="img-quality"
                      type="range"
                      min={50}
                      max={95}
                      step={5}
                      value={Math.round(quality * 100)}
                      disabled={!compress}
                      onChange={(e) => setQuality(Number(e.target.value) / 100)}
                      className="h-6 w-full cursor-pointer accent-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Sisi terpanjang maksimum</div>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      size="sm"
                      value={maxDimKey}
                      onValueChange={(v) => v && setMaxDimKey(v)}
                      disabled={!compress}
                      aria-label="Ukuran maksimum"
                      className="flex-wrap"
                    >
                      {MAX_DIMS.map((d) => (
                        <ToggleGroupItem key={d.key} value={d.key}>
                          {d.label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Hasil kompres disimpan sebagai WebP: lebih kecil dengan tampilan yang nyaris sama.
                </p>
              </fieldset>
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-lg border bg-muted/40 px-3 py-2 text-sm" role="status" aria-live="polite">
          {preparing || !prepared ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Menghitung hasil…
            </span>
          ) : (
            <span>
              <span className="font-medium">Hasil:</span> {prepared.width} × {prepared.height} px ·{" "}
              {formatBytes(prepared.file.size)}
              {unchanged ? (
                <span className="text-muted-foreground"> (berkas asli, tidak diubah)</span>
              ) : prepared.file.size < file.size ? (
                <span className="text-muted-foreground">
                  {" "}
                  (asli {formatBytes(file.size)}, hemat{" "}
                  {Math.round((1 - prepared.file.size / file.size) * 100)}%)
                </span>
              ) : (
                <span className="text-muted-foreground"> (asli {formatBytes(file.size)})</span>
              )}
            </span>
          )}
        </div>
        {sizeTooBig ? (
          <p role="alert" className="mt-2 text-sm font-medium text-destructive">
            Ukuran melebihi batas {formatBytes(MAX_MEDIA_IMAGE_BYTES)}.
            {editable ? " Aktifkan kompres, turunkan kualitas, atau perkecil ukuran maksimum." : ""}
          </p>
        ) : null}
        {shown ? (
          <p role="alert" className="mt-2 whitespace-pre-line text-sm font-medium text-destructive">
            {shown}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Batal
        </Button>
        <Button type="button" onClick={() => prepared && onConfirm(prepared.file)} disabled={!canSubmit}>
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="size-4" aria-hidden="true" />
          )}
          {busy ? "Mengunggah…" : "Unggah"}
        </Button>
      </div>
    </div>
  );
}
