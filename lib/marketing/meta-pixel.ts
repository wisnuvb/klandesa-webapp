"use client";

/**
 * Meta Pixel (Facebook/Instagram Ads). ID dibaca dari NEXT_PUBLIC_META_PIXEL_ID saat build; kosong = semua fungsi
 * di sini no-op dan tidak ada skrip Meta yang dimuat. Skrip hanya dimuat setelah pengunjung menyetujui cookie.
 *
 * Aturan data: tidak pernah mengirim nama, nomor telepon, email, atau isi formulir ke Meta. Advanced matching dan
 * pelacakan otomatis (autoConfig) dimatikan agar Pixel tidak membaca isian formulir sendiri.
 */
/** Hanya angka (ID Pixel Meta 15–16 digit); nilai lain diabaikan supaya aman dipakai di skrip. */
export function parsePixelId(raw: string | undefined): string | null {
  const id = (raw ?? "").trim();
  return /^\d{6,20}$/.test(id) ? id : null;
}

export const META_PIXEL_ID: string | null = parsePixelId(process.env.NEXT_PUBLIC_META_PIXEL_ID);

export type MetaStandardEvent =
  | "PageView"
  | "ViewContent"
  | "Lead"
  | "Contact"
  | "CompleteRegistration";

type MetaParams = Record<string, string | number | boolean>;

type Fbq = {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const QUEUE_LIMIT = 20;
let pending: Array<{ event: MetaStandardEvent; params?: MetaParams; eventId?: string }> = [];
let ready = false;

function createStub(): Fbq {
  const stub = function (...args: unknown[]) {
    if (stub.callMethod) stub.callMethod(...args);
    else stub.queue.push(args);
  } as Fbq;
  stub.push = stub;
  stub.loaded = true;
  stub.version = "2.0";
  stub.queue = [];
  return stub;
}

/** Muat fbevents.js dan inisialisasi Pixel (sekali). Dipanggil hanya setelah persetujuan. */
export function startMetaPixel(): boolean {
  if (!META_PIXEL_ID || typeof window === "undefined") return false;
  if (ready) return true;

  if (!window.fbq) {
    const fbq = createStub();
    window.fbq = fbq;
    window._fbq = fbq;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
  const fbq = window.fbq!;
  fbq("set", "autoConfig", false, META_PIXEL_ID);
  fbq("init", META_PIXEL_ID);
  ready = true;

  const queued = pending;
  pending = [];
  for (const item of queued) send(item.event, item.params, item.eventId);
  return true;
}

function send(event: MetaStandardEvent, params?: MetaParams, eventId?: string) {
  const fbq = window.fbq;
  if (!fbq) return;
  const options = eventId ? { eventID: eventId } : undefined;
  if (params && options) fbq("track", event, params, options);
  else if (params) fbq("track", event, params);
  else if (options) fbq("track", event, {}, options);
  else fbq("track", event);
}

/**
 * Kirim event. Bila Pixel belum aktif (menunggu persetujuan), event ditahan di memori (maks. 20, tidak disimpan ke
 * disk) dan dikirim saat Pixel mulai; bila persetujuan ditolak, antrean dibuang oleh `stopMetaPixel`.
 */
export function trackMeta(event: MetaStandardEvent, params?: MetaParams, eventId?: string): void {
  if (!META_PIXEL_ID || typeof window === "undefined") return;
  if (ready) {
    send(event, params, eventId);
    return;
  }
  if (pending.length < QUEUE_LIMIT) pending.push({ event, params, eventId });
}

/** Persetujuan ditolak/ditarik: buang antrean. (Skrip yang sudah termuat tidak dapat dibongkar tanpa memuat ulang.) */
export function stopMetaPixel(): void {
  pending = [];
}

/** ID unik per kejadian; dipakai bersama Conversions API (server) bila kelak ditambahkan, agar tidak terhitung ganda. */
export function newMetaEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
