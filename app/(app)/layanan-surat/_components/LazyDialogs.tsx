"use client";

/**
 * Dialog yang hanya dipakai setelah klik dimuat sebagai chunk terpisah. Dialog ini menarik validator
 * dokumen (zod, ±290 KB) dan kertas surat; tanpa ini seluruhnya ikut bundel awal halaman daftar.
 * Chunk mulai diunduh setelah halaman tampil (komponen di-render tertutup), bukan saat klik pertama.
 */
import dynamic from "next/dynamic";

export const V2TemplatePreviewDialog = dynamic(() => import("./V2Views").then((m) => m.V2TemplatePreviewDialog), { ssr: false });
export const V2LetterDialog = dynamic(() => import("./V2Views").then((m) => m.V2LetterDialog), { ssr: false });
export const NewTemplateDialog = dynamic(() => import("../editor/_components/NewTemplateDialog").then((m) => m.NewTemplateDialog), { ssr: false });
