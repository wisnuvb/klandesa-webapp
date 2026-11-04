"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import type { OrgLink } from "@/lib/officials/org";

type Path = { key: string; d: string; label: string };

const LEVEL_GAP = 7; // jarak garis di atas deretan kartu (di bawah bus solid yang 24px)
const LEVEL_STEP = 5;
const X_OFFSET = 16; // geser dari batang solid yang masuk ke tengah kartu/pita

/**
 * Garis koordinasi (putus-putus) sebagai lapisan SVG di atas bagan. Posisi dibaca dari DOM
 * (kartu bertanda data-org-id) dan dikembalikan ke ukuran tanpa zoom, lalu digambar siku:
 * naik dari koordinator, melintas di celah atas deretan, turun ke target (pita bila target ada di pita).
 */
export function OrgLinks({
  contentRef,
  links,
  zoom,
  names,
  version,
}: {
  contentRef: RefObject<HTMLElement | null>;
  links: OrgLink[];
  zoom: number;
  names: Map<number, string>;
  /** Berubah saat tata letak berubah (lipat/buka, filter, data) agar posisi dihitung ulang. */
  version: string;
}) {
  const [paths, setPaths] = useState<Path[]>([]);

  useLayoutEffect(() => {
    const root = contentRef.current;
    if (!root || links.length === 0) return;
    const compute = () => {
      const base = root.getBoundingClientRect();
      const rectOf = (el: Element) => {
        const r = el.getBoundingClientRect();
        return { left: (r.left - base.left) / zoom, right: (r.right - base.left) / zoom, top: (r.top - base.top) / zoom, bottom: (r.bottom - base.top) / zoom };
      };
      const out: Path[] = [];
      const levels = new Map<number, number>();
      const seen = new Set<string>();
      for (const link of links) {
        const from = root.querySelector(`[data-org-id="${link.from}"]`);
        const to = root.querySelector(`[data-org-id="${link.to}"]`);
        if (!from || !to) continue;
        // Target di dalam pita: tuju pita (satu panah per pita), bukan tiap kartu.
        const target = to.closest("[data-org-band]") ?? to;
        const key = `${link.from}>${target === to ? link.to : `band:${(target as HTMLElement).dataset.orgBand}:${Math.round(rectOf(target).left)}`}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const a = rectOf(from);
        const b = rectOf(target);
        const ax = (a.left + a.right) / 2 + X_OFFSET;
        const bx = (b.left + b.right) / 2 + X_OFFSET;
        const rowTop = Math.min(a.top, b.top);
        const slot = Math.round(rowTop);
        const k = levels.get(slot) ?? 0;
        levels.set(slot, k + 1);
        const y = rowTop - LEVEL_GAP - k * LEVEL_STEP;
        out.push({
          key,
          d: `M ${ax} ${a.top} V ${y} H ${bx} V ${b.top - 2}`,
          label: `${names.get(link.from) ?? "Koordinator"} mengoordinasikan ${names.get(link.to) ?? "perangkat"}`,
        });
      }
      setPaths(out);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(root);
    return () => ro.disconnect();
    // `version` memicu hitung ulang saat tata letak berubah tanpa mengubah ukuran akar.
  }, [contentRef, links, zoom, names, version]);

  if (links.length === 0 || paths.length === 0) return null;
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible text-orange-600">
      <defs>
        <marker id="org-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>
      {paths.map((p) => (
        <path key={p.key} d={p.d} fill="none" stroke="currentColor" strokeWidth={2} strokeDasharray="6 4" markerEnd="url(#org-arrow)">
          <title>{p.label}</title>
        </path>
      ))}
    </svg>
  );
}
