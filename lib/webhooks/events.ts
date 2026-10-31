/**
 * Katalog kejadian webhook. Kejadian bersifat "tipis": hanya id dan jenis, TANPA data pribadi. Penerima mengambil
 * detailnya lewat /api/v1 memakai kunci API miliknya, sehingga penyamaran dan scope tetap berlaku.
 * Menambah kejadian = menambah baris di sini, lalu memanggil `emitWebhookEvent` di titik yang tepat (setelah commit).
 */
export const WEBHOOK_EVENTS = {
  "penduduk.dibuat": { label: "Warga baru dicatat", detail: "Berisi id warga. Ambil detailnya lewat /api/v1/penduduk/{id}.", fetchWith: "kependudukan:read" },
  "mutasi.diterapkan": {
    label: "Mutasi penduduk diterapkan",
    detail: "Kelahiran, kematian, pindah, datang, atau ganti KK yang sudah berlaku. Berisi id mutasi, jenis, dan id warga.",
    fetchWith: "kependudukan:read",
  },
  "pengumuman.terbit": { label: "Pengumuman baru terbit", detail: "Berisi id pengumuman. Ambil isinya lewat /api/v1/pengumuman.", fetchWith: "pengumuman:read" },
  "data-kustom.baris.dibuat": { label: "Data kustom ditambah", detail: "Berisi id tabel, nama tabel (slug), dan id baris.", fetchWith: "data-kustom:read" },
  "usulan.baru": { label: "Ada usulan perubahan data", detail: "Aplikasi lain mengusulkan data kustom dan menunggu persetujuan admin. Berisi id usulan, nama tabel, dan jenis usulan.", fetchWith: "data-kustom:propose" },
  "data-kustom.baris.diubah": { label: "Data kustom diubah", detail: "Berisi id tabel, nama tabel (slug), dan id baris.", fetchWith: "data-kustom:read" },
} as const;

export type WebhookEventType = keyof typeof WEBHOOK_EVENTS;
/** Kejadian uji dikirim lewat tombol "Kirim uji"; tidak bisa dilanggan. */
export const TEST_EVENT = "webhook.tes";

export const ALL_WEBHOOK_EVENTS = Object.keys(WEBHOOK_EVENTS) as WebhookEventType[];
export const isWebhookEvent = (s: unknown): s is WebhookEventType => typeof s === "string" && Object.prototype.hasOwnProperty.call(WEBHOOK_EVENTS, s);

export type ParsedEvents = { ok: true; events: WebhookEventType[] } | { ok: false; error: string };

export function parseEvents(input: unknown): ParsedEvents {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, error: "Pilih minimal satu kejadian." };
  if (input.some((e) => !isWebhookEvent(e))) return { ok: false, error: "Ada kejadian yang tidak dikenal." };
  return { ok: true, events: [...new Set(input as WebhookEventType[])] };
}

export const readEvents = (value: unknown): WebhookEventType[] => (Array.isArray(value) ? value.filter(isWebhookEvent) : []);
