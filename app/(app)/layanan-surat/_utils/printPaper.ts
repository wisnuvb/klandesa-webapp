import { letterPrintCss } from "@/components/letters/LetterPaper";
import type { LetterDocument } from "@/lib/letters/document/schema";

/**
 * Cetak elemen kertas lewat iframe terisolasi: gaya dialog/halaman tidak ikut, ukuran kertas
 * dan margin mengikuti dokumen (`@page`). iframe tanpa skrip (`sandbox` tanpa allow-scripts).
 * Mengembalikan false bila pencetakan tidak dapat dimulai.
 */
export function printPaper(el: HTMLElement | null, doc: LetterDocument, title: string): boolean {
  if (!el || typeof document === "undefined") return false;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-same-origin allow-modals");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";

  const safeTitle = title.replace(/[<>&"]/g, "");
  const reset = "html,body{margin:0;padding:0;background:#fff}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}";
  iframe.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title><style>${reset}${letterPrintCss(doc)}</style></head><body>${el.outerHTML}</body></html>`;

  const cleanup = () => window.setTimeout(() => iframe.remove(), 1000);
  iframe.onload = () => {
    const w = iframe.contentWindow;
    if (!w) return cleanup();
    w.onafterprint = cleanup;
    w.focus();
    w.print();
    // Cadangan bila onafterprint tidak terpanggil (beberapa peramban).
    window.setTimeout(() => iframe.remove(), 60_000);
  };
  document.body.appendChild(iframe);
  return true;
}
