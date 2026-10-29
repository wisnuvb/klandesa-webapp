"use client";

import dynamic from "next/dynamic";
import type { InlineEditorProps } from "./InlineEditor";

/** Tiptap dimuat malas (hanya saat ada bagian yang disunting) agar halaman awal tetap ringan. */
export const InlineEditor = dynamic<InlineEditorProps>(() => import("./InlineEditor"), {
  ssr: false,
  loading: () => <span className="text-slate-400">…</span>,
});

/** Panaskan modul editor di waktu senggang supaya klik pertama tidak menunggu unduhan. */
export function prefetchInlineEditor(): void {
  void import("./InlineEditor");
}
