/**
 * Pra-pemrosesan citra untuk OCR KK pada larik abu-abu (murni; dipakai peramban lewat ImageData dan skrip evaluasi lewat sharp).
 * Urutan: luruskan kemiringan → ratakan bayangan/pencahayaan → regangkan kontras.
 */

export interface Gray {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** RGBA (ImageData) → abu-abu. */
export function rgbaToGray(rgba: Uint8ClampedArray, width: number, height: number): Gray {
  const out = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) out[i] = (rgba[p] * 299 + rgba[p + 1] * 587 + rgba[p + 2] * 114) / 1000;
  return { data: out, width, height };
}

/** Perkecil dengan rata-rata kotak (cukup untuk memperkirakan kemiringan). */
function downscale(g: Gray, targetWidth: number): Gray {
  const f = Math.max(1, Math.floor(g.width / targetWidth));
  if (f === 1) return g;
  const w = Math.floor(g.width / f);
  const h = Math.floor(g.height / f);
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let dy = 0; dy < f; dy++) for (let dx = 0; dx < f; dx++) sum += g.data[(y * f + dy) * g.width + x * f + dx];
      out[y * w + x] = sum / (f * f);
    }
  }
  return { data: out, width: w, height: h };
}

/**
 * Perkiraan sudut kemiringan teks (derajat, searah jarum jam positif) dari proyeksi baris piksel gelap:
 * pada sudut yang benar, baris teks menumpuk sehingga ragam proyeksi maksimum. Rentang ±maxDeg.
 */
export function estimateSkew(g: Gray, maxDeg = 6, step = 0.25): number {
  const s = downscale(g, 700);
  // Biner kasar: piksel lebih gelap dari rata-rata lokal ≈ tinta.
  const bg = boxBlur(s, Math.max(6, Math.round(s.width / 40)));
  const ink: Array<[number, number]> = [];
  for (let y = 0; y < s.height; y++) {
    for (let x = 0; x < s.width; x++) {
      const i = y * s.width + x;
      if (s.data[i] < bg[i] * 0.78) ink.push([x, y]);
    }
  }
  if (ink.length < 200) return 0;
  const cx = s.width / 2;
  const cy = s.height / 2;
  let best = 0;
  let bestScore = -1;
  const bins = new Float64Array(s.height * 2 + 4);
  for (let a = -maxDeg; a <= maxDeg + 1e-9; a += step) {
    const rad = (a * Math.PI) / 180;
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    bins.fill(0);
    for (const [x, y] of ink) {
      // Baris teks miring a° searah jarum jam → y' = (y−cy)·cos − (x−cx)·sin meluruskannya.
      const yr = Math.round((y - cy) * cos - (x - cx) * sin + s.height);
      if (yr >= 0 && yr < bins.length) bins[yr] += 1;
    }
    let score = 0;
    for (let i = 1; i < bins.length; i++) {
      const d = bins[i] - bins[i - 1];
      score += d * d;
    }
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return Math.round(best * 100) / 100;
}

/** Rata-rata kotak (jendela (2r+1)²) lewat citra integral; mengembalikan Float32Array. */
function boxBlur(g: Gray, r: number): Float32Array {
  const { width: w, height: h, data } = g;
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += data[y * w + x];
      integral[(y + 1) * (w + 1) + x + 1] = integral[y * (w + 1) + x + 1] + row;
    }
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w, x + r + 1);
      const sum = integral[y1 * (w + 1) + x1] - integral[y0 * (w + 1) + x1] - integral[y1 * (w + 1) + x0] + integral[y0 * (w + 1) + x0];
      out[y * w + x] = sum / ((y1 - y0) * (x1 - x0));
    }
  }
  return out;
}

/** Putar `angle` derajat (searah jarum jam positif) dengan interpolasi bilinear; ruang kosong diisi putih. */
export function rotateGray(g: Gray, angle: number): Gray {
  if (Math.abs(angle) < 0.05) return g;
  const { width: w, height: h, data } = g;
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = w / 2;
  const cy = h / 2;
  const out = new Uint8ClampedArray(w * h).fill(255);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Pemetaan balik: titik tujuan → titik sumber.
      const dx = x - cx;
      const dy = y - cy;
      const sx = dx * cos + dy * sin + cx;
      const sy = -dx * sin + dy * cos + cy;
      if (sx < 0 || sy < 0 || sx >= w - 1 || sy >= h - 1) continue;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const fx = sx - x0;
      const fy = sy - y0;
      const i = y0 * w + x0;
      out[y * w + x] = data[i] * (1 - fx) * (1 - fy) + data[i + 1] * fx * (1 - fy) + data[i + w] * (1 - fx) * fy + data[i + w + 1] * fx * fy;
    }
  }
  return { data: out, width: w, height: h };
}

/** Ratakan bayangan: bagi dengan latar lokal (rata-rata kotak besar), sehingga kertas jadi putih merata dan tinta tetap gelap. */
export function flattenBackground(g: Gray, radius = Math.max(20, Math.round(g.width / 25))): Gray {
  const bg = boxBlur(downscaleFor(g), Math.max(4, Math.round(radius / Math.max(1, Math.floor(g.width / 700)))));
  const f = Math.max(1, Math.floor(g.width / 700));
  const sw = Math.floor(g.width / f);
  const out = new Uint8ClampedArray(g.data.length);
  for (let y = 0; y < g.height; y++) {
    for (let x = 0; x < g.width; x++) {
      const b = Math.max(40, bg[Math.min(Math.floor(y / f), Math.floor(g.height / f) - 1) * sw + Math.min(Math.floor(x / f), sw - 1)]);
      out[y * g.width + x] = Math.min(255, (g.data[y * g.width + x] / b) * 235);
    }
  }
  return { data: out, width: g.width, height: g.height };
}

const downscaleFor = (g: Gray) => downscale(g, 700);

/** Regangkan kontras: persentil `low`..`high` dipetakan ke 0..255. */
export function stretchContrast(g: Gray, low = 0.01, high = 0.995): Gray {
  const hist = new Uint32Array(256);
  for (const v of g.data) hist[v] += 1;
  const total = g.data.length;
  let acc = 0;
  let lo = 0;
  let hi = 255;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= total * low) {
      lo = i;
      break;
    }
  }
  acc = 0;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= total * high) {
      hi = i;
      break;
    }
  }
  if (hi - lo < 16) return g;
  const out = new Uint8ClampedArray(g.data.length);
  const scale = 255 / (hi - lo);
  for (let i = 0; i < out.length; i++) out[i] = (g.data[i] - lo) * scale;
  return { data: out, width: g.width, height: g.height };
}

export interface PrepResult {
  gray: Gray;
  /** Sudut yang dikoreksi (derajat). */
  skew: number;
}

/** Seluruh rangkaian pra-pemrosesan. */
export function prepareForOcr(g: Gray): PrepResult {
  const skew = estimateSkew(g);
  // Teks miring searah jarum jam → putar balik berlawanan arah.
  const straight = rotateGray(g, -skew);
  return { gray: stretchContrast(flattenBackground(straight)), skew };
}
