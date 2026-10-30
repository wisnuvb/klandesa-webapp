/**
 * Render surat v2 ke HTML statis di server (untuk `contentHtml`, unduhan mobile, arsip).
 * Memakai komponen yang sama dengan pratinjau; `<style>` dirakit dari angka/enum tervalidasi,
 * bukan dari input bebas.
 *
 * `react-dom/server` dimuat dinamis: Next melarang impor statisnya di grafik server App Router,
 * sedangkan renderer harus tetap satu (komponen yang sama dengan pratinjau).
 */
import { LetterPaper, letterPrintCss } from "@/components/letters/LetterPaper";
import type { LetterDocument } from "@/lib/letters/document/schema";
import type { LetterValues } from "@/lib/letters/values";

export type RenderLetterArgs = {
  doc: LetterDocument;
  values: LetterValues;
  /** Gambar QR verifikasi yang dibuat pemanggil (data URL png/svg atau path aman). */
  qrSrc?: string;
};

let serverRenderer: Promise<typeof import("react-dom/server")> | null = null;
function loadServerRenderer() {
  serverRenderer ??= import("react-dom/server").catch((err) => {
    serverRenderer = null; // gagal: coba lagi pada pemanggilan berikutnya
    throw err;
  });
  return serverRenderer;
}
// Pemanasan saat modul dimuat: impor pertama memakan ≈33 ms, dan tanpa ini terjadi di dalam transaksi
// penerbitan yang sedang memegang kunci penghitung nomor.
if (typeof window === "undefined") loadServerRenderer().catch(() => {});

/** Fragmen HTML: `<style>` cetak + kertas. Aman disimpan sebagai `contentHtml`. */
export async function renderLetterHtml({ doc, values, qrSrc }: RenderLetterArgs): Promise<string> {
  const { renderToStaticMarkup } = await loadServerRenderer();
  const paper = renderToStaticMarkup(<LetterPaper doc={doc} values={values} mode="print" qrSrc={qrSrc} />);
  return `<style>${letterPrintCss(doc)}</style>${paper}`;
}

/** Dokumen HTML utuh siap dibuka/dicetak. */
export async function renderLetterHtmlDocument(args: RenderLetterArgs): Promise<string> {
  return [
    "<!doctype html>",
    '<html lang="id"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>Surat</title>",
    "<style>body{margin:0;background:#f3f4f6}@media print{body{background:#fff}}</style>",
    "</head><body>",
    await renderLetterHtml(args),
    "</body></html>",
  ].join("");
}
