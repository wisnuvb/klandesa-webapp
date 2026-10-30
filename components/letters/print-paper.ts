import { letterPrintCss } from "./LetterPaper";
import type { LetterDocument } from "@/lib/letters/document/schema";

/**
 * Cetak isi pembungkus kertas (`el`, mode print) lewat iframe tersembunyi: gaya aplikasi/dialog tidak ikut,
 * ukuran kertas dan margin mengikuti dokumen (`@page`). iframe tanpa skrip (`sandbox` tanpa allow-scripts);
 * isi berasal dari DOM React (sudah ter-escape) dan CSS cetak dari enum/angka tervalidasi.
 * Resolve `true` setelah dialog cetak dipanggil, `false` bila iframe/pencetakan tidak bisa dimulai
 * (pemanggil boleh memakai cadangan `window.print()` atau menampilkan petunjuk).
 */
export function printPaperElement(el: HTMLElement | null, doc: LetterDocument, title: string): Promise<boolean> {
  if (!el || typeof document === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => {
    try {
      const frame = document.createElement("iframe");
      frame.setAttribute("sandbox", "allow-same-origin allow-modals");
      frame.setAttribute("aria-hidden", "true");
      frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";

      const safeTitle = title.replace(/[<>&"]/g, "");
      const reset = "html,body{margin:0;padding:0;background:#fff}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}";
      frame.srcdoc =
        `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title>` +
        `<style>${reset}${letterPrintCss(doc)}</style></head><body>${el.innerHTML}</body></html>`;

      let done = false;
      const cleanup = () => window.setTimeout(() => frame.remove(), 1000);
      frame.onload = () => {
        if (done) return;
        done = true;
        const w = frame.contentWindow;
        if (!w) {
          frame.remove();
          resolve(false);
          return;
        }
        w.addEventListener("afterprint", cleanup);
        try {
          w.focus();
          w.print();
          resolve(true);
        } catch {
          frame.remove();
          resolve(false);
        }
        // Cadangan bila `afterprint` tidak terpicu di peramban tertentu.
        window.setTimeout(() => frame.remove(), 60_000);
      };
      document.body.appendChild(frame);
    } catch {
      resolve(false);
    }
  });
}
