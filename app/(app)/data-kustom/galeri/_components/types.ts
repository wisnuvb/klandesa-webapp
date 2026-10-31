import type { TemplateCard, TemplateDetail, InstallView } from "@/lib/village-apps/service";

export type { TemplateCard, TemplateDetail, InstallView };
export interface GalleryResponse {
  canManage: boolean;
  published: TemplateCard[];
  mine: TemplateCard[];
  installs: InstallView[];
}

export const STATUS_LABEL: Record<TemplateCard["status"], { label: string; cls: string }> = {
  PENDING: { label: "Menunggu tinjauan", cls: "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50" },
  PUBLISHED: { label: "Tampil di galeri", cls: "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-50" },
  REJECTED: { label: "Ditolak", cls: "border-red-300 bg-red-50 text-red-950 dark:border-red-700 dark:bg-red-950 dark:text-red-50" },
  WITHDRAWN: { label: "Ditarik", cls: "border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50" },
};

export const TYPE_LABEL: Record<string, string> = { text: "Teks pendek", longtext: "Teks panjang", number: "Angka", date: "Tanggal", boolean: "Ya / Tidak", select: "Pilihan" };
export const PII_LABEL: Record<string, string> = { NONE: "Bukan data pribadi", PERSONAL: "Data pribadi", SENSITIVE: "Data sangat sensitif" };
