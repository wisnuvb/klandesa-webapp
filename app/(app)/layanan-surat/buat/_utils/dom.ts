/** Utilitas DOM kecil untuk komposer: fokus ke input dari klik kertas. (Cetak: components/letters/print-paper.ts) */

const FOCUSABLE = "input:not([type=hidden]),textarea,select,button,[role=radio],[role=switch]";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/** Kontainer gulir terdekat (panel formulir). `scrollIntoView` menggulir semua leluhur, termasuk shell aplikasi. */
function scrollParentOf(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

/** Gulir hanya di dalam panel agar `target` berada di tengahnya; halaman dan shell tidak ikut bergeser. */
function centerWithinPane(target: HTMLElement) {
  const pane = scrollParentOf(target);
  if (!pane) return;
  const t = target.getBoundingClientRect();
  const b = pane.getBoundingClientRect();
  const top = pane.scrollTop + (t.top - b.top) - (b.height - t.height) / 2;
  pane.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

/** Fokus ke input (atau elemen pertama yang bisa difokus di dalamnya), gulir ke tengah, dan beri sorotan singkat. */
export function focusInput(id: string, fallbackId?: string): boolean {
  const el = document.getElementById(id) ?? (fallbackId ? document.getElementById(fallbackId) : null);
  if (!el) return false;
  const target = el.matches(FOCUSABLE) ? el : (el.querySelector(FOCUSABLE) as HTMLElement | null);
  if (!target) return false;
  centerWithinPane(target);
  target.focus({ preventScroll: true });
  const host = target.closest("[data-lc-field]") ?? target;
  host.setAttribute("data-lc-flash", "1");
  window.setTimeout(() => host.removeAttribute("data-lc-flash"), 1600);
  return true;
}
