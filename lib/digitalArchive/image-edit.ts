/**
 * Potong & kompres gambar di sisi klien sebelum diunggah ke arsip.
 * Bagian atas modul ini murni (tanpa DOM) sehingga bisa diuji; `processImage` memakai canvas.
 */
import { MEDIA_IMAGE_MIME_EXT, normalizeMime } from "./media";

/** Batas sisi terpanjang hasil olahan: menjaga canvas tetap di bawah batas memori peramban seluler. */
export const HARD_MAX_DIMENSION = 4096;

export type CropRect = { x: number; y: number; w: number; h: number };

/**
 * Persegi potong terbesar berasio `aspect` (lebar/tinggi) yang muat di dalam gambar;
 * `aspect` null = seluruh gambar.
 */
export function baseCropSize(imgW: number, imgH: number, aspect: number | null): { w: number; h: number } {
  if (!aspect || !Number.isFinite(aspect) || aspect <= 0) return { w: imgW, h: imgH };
  const w = Math.min(imgW, imgH * aspect);
  return { w, h: w / aspect };
}

/**
 * Area potong pada koordinat piksel gambar asli. `zoom` ≥ 1 memperkecil area; (cx, cy) adalah
 * titik tengah yang diinginkan dan dijepit agar area tidak keluar dari gambar.
 */
export function cropRect(p: {
  imgW: number;
  imgH: number;
  aspect: number | null;
  zoom: number;
  cx: number;
  cy: number;
}): CropRect {
  const base = baseCropSize(p.imgW, p.imgH, p.aspect);
  const zoom = Math.max(1, p.zoom);
  const w = base.w / zoom;
  const h = base.h / zoom;
  const cx = Math.min(p.imgW - w / 2, Math.max(w / 2, p.cx));
  const cy = Math.min(p.imgH - h / 2, Math.max(h / 2, p.cy));
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** Ukuran hasil bila dimuat dalam `maxDim` (sisi terpanjang). Tidak pernah membesarkan. */
export function fitWithin(w: number, h: number, maxDim: number | null): { w: number; h: number } {
  const limit = Math.min(maxDim ?? HARD_MAX_DIMENSION, HARD_MAX_DIMENSION);
  const scale = Math.min(1, limit / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

/** Ukuran bingkai pratinjau (px layar) untuk rasio tertentu di dalam ruang yang tersedia. */
export function frameSize(availW: number, maxH: number, aspect: number): { w: number; h: number } {
  const h = Math.max(1, Math.min(maxH, availW / aspect));
  return { w: Math.max(1, h * aspect), h };
}

export type ProcessOptions = {
  rect: CropRect;
  compress: boolean;
  /** 0.5–0.95; hanya berlaku saat `compress`. */
  quality: number;
  /** Sisi terpanjang maksimum; null = tidak diperkecil (tetap dibatasi HARD_MAX_DIMENSION). */
  maxDim: number | null;
};

export type ProcessedImage = { file: File; width: number; height: number };

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Gagal membuat gambar hasil."))),
      mime,
      quality,
    );
  });
}

/**
 * Potong + (opsional) kompres ke WebP. `img` harus sudah termuat. Bila tidak ada yang berubah
 * (seluruh gambar, tanpa kompres) berkas asli dikembalikan apa adanya, tanpa encode ulang.
 */
export async function processImage(
  img: HTMLImageElement,
  file: File,
  opts: ProcessOptions,
): Promise<ProcessedImage> {
  const natW = img.naturalWidth;
  const natH = img.naturalHeight;
  const { rect } = opts;
  const isFull = rect.w >= natW - 0.5 && rect.h >= natH - 0.5;

  if (!opts.compress && isFull) return { file, width: natW, height: natH };

  const size = fitWithin(rect.w, rect.h, opts.compress ? opts.maxDim : null);
  const canvas = document.createElement("canvas");
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Peramban tidak mendukung pemrosesan gambar.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h, 0, 0, size.w, size.h);

  const sourceMime = normalizeMime(file.type);
  const mime = opts.compress ? "image/webp" : sourceMime in MEDIA_IMAGE_MIME_EXT ? sourceMime : "image/png";
  const quality = opts.compress ? Math.min(0.95, Math.max(0.5, opts.quality)) : 0.92;
  const blob = await canvasToBlob(canvas, mime, quality);

  // Kompres ulang berkas yang sudah efisien bisa malah membesar: pakai yang asli.
  const unchangedGeometry = isFull && size.w === natW && size.h === natH;
  if (unchangedGeometry && blob.size >= file.size) return { file, width: natW, height: natH };

  const base = file.name.replace(/\.[^.]+$/, "") || "gambar";
  const out = new File([blob], `${base}.${MEDIA_IMAGE_MIME_EXT[mime]}`, { type: mime });
  return { file: out, width: size.w, height: size.h };
}
