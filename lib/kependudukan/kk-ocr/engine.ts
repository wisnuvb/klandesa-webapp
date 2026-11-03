/**
 * OCR foto KK di peramban (tesseract.js, WASM). Foto tidak dikirim ke server mana pun: mesin, data bahasa Indonesia,
 * dan worker dilayani dari /ocr (lihat public/ocr/README.txt). Hanya dipakai dari komponen klien.
 */
import { prepareForOcr, rgbaToGray } from "./image-ops";
import type { OcrLine } from "./lines";
import { pageToLines, type PageLike } from "./page";

export type OcrStage = "image" | "engine" | "read";
export interface OcrProgress {
  stage: OcrStage;
  /** 0..1 untuk tahap `read`; tahap lain tak berpersentase. */
  fraction: number | null;
}

/** Sisi terpanjang yang dituju: teks tabel KK perlu tinggi huruf ±20 piksel agar terbaca. */
export const TARGET_LONG_SIDE = 3000;
export const MIN_USABLE_LONG_SIDE = 1600;
export const LOW_CONFIDENCE = 60;

export type Rotation = 0 | 90 | 180 | 270;

export interface OcrResult {
  lines: OcrLine[];
  /** Kemiringan foto yang dikoreksi (derajat). */
  skew: number;
  /** Keyakinan rata-rata mesin 0–100. */
  confidence: number;
  width: number;
  height: number;
}

const SIMD_PROBE = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);
const supportsSimd = () => {
  try {
    return typeof WebAssembly === "object" && WebAssembly.validate(SIMD_PROBE);
  } catch {
    return false;
  }
};

export interface ImageInfo {
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

/** Buka berkas gambar dengan orientasi EXIF dihormati (foto ponsel kerap tersimpan miring). */
export async function openImage(file: File): Promise<ImageInfo> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  return { bitmap, width: bitmap.width, height: bitmap.height };
}

const yieldToUi = () => new Promise<void>((r) => setTimeout(r, 0));

function drawScaled(bitmap: ImageBitmap, rotation: Rotation): HTMLCanvasElement {
  const swap = rotation === 90 || rotation === 270;
  const w0 = swap ? bitmap.height : bitmap.width;
  const h0 = swap ? bitmap.width : bitmap.height;
  const long = Math.max(w0, h0);
  const scale = long < 2400 || long > 3400 ? TARGET_LONG_SIDE / long : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w0 * scale);
  canvas.height = Math.round(h0 * scale);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Peramban tidak mendukung kanvas.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  const dw = (swap ? canvas.height : canvas.width);
  const dh = (swap ? canvas.width : canvas.height);
  ctx.drawImage(bitmap, -dw / 2, -dh / 2, dw, dh);
  return canvas;
}

export async function recognizeKk(image: ImageInfo, rotation: Rotation, onProgress: (p: OcrProgress) => void, signal?: AbortSignal): Promise<OcrResult> {
  const aborted = () => {
    if (signal?.aborted) throw new DOMException("Dibatalkan", "AbortError");
  };

  onProgress({ stage: "image", fraction: null });
  await yieldToUi();
  const canvas = drawScaled(image.bitmap, rotation);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height);
  await yieldToUi();
  const { gray, skew } = prepareForOcr(rgbaToGray(rgba.data, canvas.width, canvas.height));
  for (let i = 0, p = 0; i < gray.data.length; i++, p += 4) {
    const v = gray.data[i];
    rgba.data[p] = v;
    rgba.data[p + 1] = v;
    rgba.data[p + 2] = v;
    rgba.data[p + 3] = 255;
  }
  ctx.putImageData(rgba, 0, 0);
  aborted();

  onProgress({ stage: "engine", fraction: null });
  await yieldToUi();
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker("ind", 1, {
    workerPath: "/ocr/worker.min.js",
    corePath: supportsSimd() ? "/ocr/tesseract-core-simd-lstm.wasm.js" : "/ocr/tesseract-core-lstm.wasm.js",
    langPath: "/ocr",
    gzip: false,
    logger: (m) => {
      if (m.status === "recognizing text") onProgress({ stage: "read", fraction: m.progress });
    },
  });
  try {
    aborted();
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK, preserve_interword_spaces: "1", user_defined_dpi: "300" });
    onProgress({ stage: "read", fraction: 0 });
    const { data } = await worker.recognize(canvas, {}, { blocks: true });
    aborted();
    return { lines: pageToLines(data as unknown as PageLike), skew, confidence: data.confidence ?? 0, width: canvas.width, height: canvas.height };
  } finally {
    await worker.terminate();
  }
}
