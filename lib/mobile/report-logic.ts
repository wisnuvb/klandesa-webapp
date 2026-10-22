/** Logika murni pengaduan untuk warga (tanpa DB). Lihat docs/MOBILE_V2_PRODUCT_SPEC.md §4.4. */

export const REPORT_CATEGORIES = [
  { key: "jalan", label: "Jalan / Drainase" },
  { key: "lampu", label: "Lampu jalan" },
  { key: "sampah", label: "Sampah" },
  { key: "air", label: "Air bersih" },
  { key: "keamanan", label: "Keamanan" },
  { key: "lainnya", label: "Lainnya" },
] as const;

export type ReportCategoryKey = (typeof REPORT_CATEGORIES)[number]["key"];

export function isReportCategory(v: unknown): v is ReportCategoryKey {
  return REPORT_CATEGORIES.some((c) => c.key === v);
}

export function categoryLabel(key: string | null | undefined): string {
  return REPORT_CATEGORIES.find((c) => c.key === key)?.label ?? "Laporan";
}

/** Judul otomatis: "Lampu jalan: Lampu depan balai mati sejak…" (maks 120). */
export function buildReportTitle(category: ReportCategoryKey, content: string): string {
  const first = content.replace(/\s+/g, " ").trim();
  const cut = first.length > 70 ? `${first.slice(0, 69).trimEnd()}…` : first;
  return `${categoryLabel(category)}: ${cut}`.slice(0, 120);
}

export type ReportStage = "sent" | "working" | "done" | "rejected";
export type StepState = "done" | "current" | "todo" | "failed";
export type ReportStep = { key: "sent" | "working" | "done"; label: string; state: StepState };

export type ReportView = { stage: ReportStage; title: string; next: string; steps: ReportStep[] };

/** Status DB (DRAFT/PENDING/PROCESS/DONE/REJECT) → bahasa warga. */
export function describeReport(status: string, hasRejectReason: boolean): ReportView {
  const mk = (a: StepState, b: StepState, c: StepState): ReportStep[] => [
    { key: "sent", label: "Diterima desa", state: a },
    { key: "working", label: "Sedang ditangani", state: b },
    { key: "done", label: "Selesai", state: c },
  ];
  switch (status) {
    case "PROCESS":
      return { stage: "working", title: "Sedang ditangani", next: "Perangkat desa sedang menindaklanjuti laporan Anda. Anda akan diberi tahu saat selesai.", steps: mk("done", "current", "todo") };
    case "DONE":
      return { stage: "done", title: "Selesai", next: "Laporan sudah ditandai selesai oleh desa. Apakah masalahnya benar-benar sudah beres?", steps: mk("done", "done", "done") };
    case "REJECT":
      return {
        stage: "rejected",
        title: "Belum bisa diproses",
        next: hasRejectReason ? "Lihat tanggapan desa di bawah. Anda bisa membuat laporan baru dengan keterangan yang lebih jelas." : "Laporan belum bisa diproses. Hubungi kantor desa untuk penjelasan.",
        steps: mk("done", "failed", "todo"),
      };
    default:
      return { stage: "sent", title: "Diterima desa", next: "Laporan Anda sudah masuk. Perangkat desa akan memeriksanya.", steps: mk("done", "current", "todo") };
  }
}

/** Kolom `images` berisi URL dipisah koma. */
export function parseImages(csv: string | null | undefined): string[] {
  return (csv ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

/** Hanya terima URL foto yang berasal dari unggahan mobile desa ini (cegah URL luar/XSS). */
export function isOwnReportPhotoUrl(url: unknown, cdnBase: string, villageCode: string): url is string {
  if (typeof url !== "string" || url.length > 500 || /[\s,"'<>]/.test(url)) return false;
  const prefix = `${cdnBase.replace(/\/+$/, "")}/villages/${villageCode}/mobile-reports/`;
  return url.startsWith(prefix) && !url.slice(prefix.length).includes("..");
}

export const MAX_REPORT_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 2_500_000;
export const MAX_REPORTS_PER_DAY = 10;

export const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function validCoordinates(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}
