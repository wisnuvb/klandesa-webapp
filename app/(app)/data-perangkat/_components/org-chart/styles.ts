import type { OrgUnit } from "@/lib/officials/org";

// Catatan: semua nama kelas ditulis utuh (bukan dirakit dari variabel) agar terdeteksi pemindai Tailwind.
// Garis penghubung memakai border-foreground/60: cukup kontras (>= 3:1) di tema terang dan gelap.

/** Penghubung antar saudara (bus horizontal + batang vertikal), gaya bagan organisasi klasik. */
export const CHILD_ITEM =
  "relative flex shrink-0 flex-col items-center px-2 pt-6 " +
  "before:absolute before:top-0 before:right-1/2 before:h-6 before:w-1/2 before:border-t-2 before:border-foreground/60 " +
  "after:absolute after:top-0 after:left-1/2 after:h-6 after:w-1/2 after:border-t-2 after:border-l-2 after:border-foreground/60 " +
  "first:before:border-0 last:after:border-0 " +
  "last:before:rounded-tr-lg last:before:border-r-2 first:after:rounded-tl-lg " +
  "only:pt-0 only:before:hidden only:after:hidden";

/** Daftar anak di bawah satu induk, dengan batang turun dari kartu induk. */
export const CHILD_LIST =
  "relative flex justify-center pt-6 before:absolute before:top-0 before:left-1/2 before:h-6 before:border-l-2 before:border-foreground/60";

/** Item pada pita (daftar menggantung): rel vertikal di kiri dan cabang pendek ke tiap kartu. */
export const HANGING_ITEM =
  "relative py-1.5 pl-6 " +
  "before:absolute before:top-0 before:left-2 before:h-full before:border-l-2 before:border-foreground/60 " +
  "last:before:h-1/2 " +
  "after:absolute after:top-1/2 after:left-2 after:w-4 after:border-t-2 after:border-foreground/60";

export const UNIT_ACCENT: Record<OrgUnit, string> = {
  LEADER: "border-l-emerald-600",
  SECRETARIAT: "border-l-sky-600",
  TECHNICAL: "border-l-amber-600",
  REGIONAL: "border-l-violet-600",
  OTHER: "border-l-slate-500",
};

export const UNIT_TEXT: Record<OrgUnit, string> = {
  LEADER: "text-emerald-800",
  SECRETARIAT: "text-sky-800",
  TECHNICAL: "text-amber-800",
  REGIONAL: "text-violet-800",
  OTHER: "text-slate-600",
};

export const UNIT_SWATCH: Record<OrgUnit, string> = {
  LEADER: "bg-emerald-600",
  SECRETARIAT: "bg-sky-600",
  TECHNICAL: "bg-amber-600",
  REGIONAL: "bg-violet-600",
  OTHER: "bg-slate-500",
};
