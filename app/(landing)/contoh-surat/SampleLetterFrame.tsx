"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** Lebar kolom konten tempat bingkai berada: max-w-4xl (896 px) dikurangi gutter halaman. */
const PAGE_MAX_PX = 896;
const BOX_CHROME_PX = 18; // p-2 (2×8) + border (2×1)

/** Skala agar kertas selebar `paperPx` muat di kotak selebar `boxPx` (tidak pernah memperbesar, minimal 0,3). */
export function fitScale(boxPx: number, paperPx: number): number {
  return Math.min(1, Math.max(0.3, (boxPx - 16) / paperPx));
}

/**
 * Media query penebak skala awal untuk HTML hasil server. Server tidak tahu lebar layar, jadi tanpa ini
 * kertas dirender penuh lalu mengecil setelah hidrasi (konten di bawahnya melompat = CLS). Tiap langkah
 * 40 px memakai lebar layar terendahnya sehingga tebakan sedikit lebih KECIL dari skala sebenarnya;
 * pengukuran klien lalu menyempurnakannya dengan selisih kecil.
 */
export function initialScaleCss(paperPx: number, selector: string): string {
  const rules: string[] = [];
  for (let vw = 320; vw <= PAGE_MAX_PX + 120; vw += 40) {
    // Gutter halaman: 16 px per sisi di ponsel, 24 px mulai sm (640 px).
    const gutter = vw >= 640 ? 48 : 32;
    const box = Math.min(vw, PAGE_MAX_PX + gutter) - gutter - BOX_CHROME_PX;
    const s = Math.round(fitScale(box, paperPx) * 1000) / 1000;
    rules.push(`@media (min-width:${vw}px){${selector}{zoom:${s}}}`);
  }
  return `${selector}{zoom:0.4}` + rules.join("");
}

/**
 * Bingkai kertas surat: kertas punya lebar tetap (mm), jadi diperkecil dengan `zoom` agar muat di
 * layar kecil tanpa menggulir ke samping. `zoom` (bukan transform: scale) ikut mengecilkan tinggi
 * tata letak. Skala awal ditebak lewat CSS (lihat initialScaleCss), lalu diukur sebelum paint pertama
 * klien (useLayoutEffect). Tanpa JS, kertas tetap tampil dan bisa digeser.
 */
export function SampleLetterFrame({ widthMm, label, children }: { widthMm: number; label: string; children: ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  const paperPx = (widthMm / 25.4) * 96;
  const cls = `slf-${Math.round(widthMm * 10)}`;

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setScale(fitScale(el.clientWidth, paperPx));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [paperPx]);

  return (
    <div
      ref={boxRef}
      role="region"
      aria-label={label}
      tabIndex={0}
      className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-gray-100 p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
    >
      <style>{initialScaleCss(paperPx, `.${cls}`)}</style>
      <div
        className={cls}
        style={{ width: `${widthMm}mm`, margin: "0 auto", ...(scale !== null ? { zoom: scale } : {}) }}
      >
        {children}
      </div>
    </div>
  );
}
