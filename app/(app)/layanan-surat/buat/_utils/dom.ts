/** Utilitas DOM kecil untuk komposer: fokus ke input dari klik kertas, dan cetak lewat iframe. */
import { letterPrintCss } from "@/components/letters/LetterPaper";
import type { LetterDocument } from "@/lib/letters/document/schema";

const FOCUSABLE = "input:not([type=hidden]),textarea,select,button,[role=radio],[role=switch]";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/** Fokus ke input (atau elemen pertama yang bisa difokus di dalamnya), gulir ke tengah, dan beri sorotan singkat. */
export function focusInput(id: string, fallbackId?: string): boolean {
  const el = document.getElementById(id) ?? (fallbackId ? document.getElementById(fallbackId) : null);
  if (!el) return false;
  const target = el.matches(FOCUSABLE) ? el : (el.querySelector(FOCUSABLE) as HTMLElement | null);
  if (!target) return false;
  target.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  target.focus({ preventScroll: true });
  const host = target.closest("[data-lc-field]") ?? target;
  host.setAttribute("data-lc-flash", "1");
  window.setTimeout(() => host.removeAttribute("data-lc-flash"), 1600);
  return true;
}

/**
 * Cetak isi `el` (kertas mode print) lewat iframe tersembunyi supaya terlepas dari tata letak aplikasi.
 * Mengembalikan false bila iframe tidak bisa dibuat (pemanggil memakai cadangan `window.print()`).
 */
export function printInIframe(el: HTMLElement, doc: LetterDocument, title: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const frame = document.createElement("iframe");
      frame.setAttribute("aria-hidden", "true");
      frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
      const safeTitle = title.replace(/[<>&"]/g, "");
      // Isi berasal dari DOM React (sudah ter-escape); CSS cetak dari enum/angka tervalidasi.
      frame.srcdoc =
        `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title>` +
        `<style>html,body{margin:0;background:#fff}${letterPrintCss(doc)}</style></head><body>${el.innerHTML}</body></html>`;
      let done = false;
      const cleanup = () => window.setTimeout(() => frame.remove(), 500);
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
