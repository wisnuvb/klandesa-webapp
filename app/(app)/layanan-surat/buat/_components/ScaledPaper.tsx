"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { LetterDocument } from "@/lib/letters/document/schema";
import { PAPER_SIZES } from "@/lib/letters/paper";

const MM_TO_PX = 96 / 25.4;

export type ZoomMode = "fit" | "100";

function paperWidthPx(doc: LetterDocument): number {
  const p = PAPER_SIZES[doc.page.size] ?? PAPER_SIZES.F4;
  const mm = doc.page.orientation === "landscape" ? p.heightMm : p.widthMm;
  return Math.round(mm * MM_TO_PX);
}

/**
 * Menampilkan kertas (lebar mm sebenarnya) dalam panel yang lebih sempit lewat `transform: scale`.
 * Tinggi pembungkus disesuaikan agar gulir panel tetap benar.
 */
export function ScaledPaper({ doc, zoom, children }: { doc: LetterDocument; zoom: ZoomMode; children: React.ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [hostW, setHostW] = useState(0);
  const [innerH, setInnerH] = useState(0);
  const paperW = paperWidthPx(doc);

  // useLayoutEffect: ukuran dibaca sebelum cat pertama sehingga kertas tidak sempat tampil sebesar 100% lalu mengecil.
  useLayoutEffect(() => {
    const h = host.current;
    const i = inner.current;
    if (!h || !i) return undefined;
    const ro = new ResizeObserver(() => {
      setHostW(h.clientWidth);
      setInnerH(i.offsetHeight);
    });
    ro.observe(h);
    ro.observe(i);
    setHostW(h.clientWidth);
    setInnerH(i.offsetHeight);
    return () => ro.disconnect();
  }, []);

  const fit = hostW > 0 ? Math.min(1, Math.max(0.2, (hostW - 8) / paperW)) : 1;
  const scale = zoom === "fit" ? fit : 1;

  return (
    <div ref={host} className="w-full overflow-x-auto" style={hostW > 0 ? undefined : { visibility: "hidden" }}>
      <div style={{ width: paperW * scale, height: innerH * scale, margin: "0 auto" }}>
        <div
          ref={inner}
          className="lc-scale"
          style={{ width: paperW, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
