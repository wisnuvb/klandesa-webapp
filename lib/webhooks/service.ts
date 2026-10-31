/** Layanan webhook (DB): tujuan, antrean kejadian, dan daftar pengiriman. Semua kueri dibatasi `villageId`. Tanpa HTTP. */
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { isWebhookEvent, parseEvents, readEvents, TEST_EVENT, type WebhookEventType } from "./events";
import { generateWebhookSecret } from "./sign";
import { validateWebhookUrl } from "./url-guard";

type Db = Prisma.TransactionClient;

export const MAX_ENDPOINTS_PER_VILLAGE = 5;
/** Setelah percobaan ke-n gagal, tunggu BACKOFF_MINUTES[n-1] menit; setelah percobaan terakhir gagal → DEAD. */
export const BACKOFF_MINUTES = [1, 5, 30, 120, 360, 1440] as const;
export const MAX_ATTEMPTS = BACKOFF_MINUTES.length + 1;
export const AUTO_DISABLE_AFTER_FAILURES = 15;
export const DELIVERY_RETENTION_DAYS = 14;

export type Result<T> = { ok: true; data: T } | { ok: false; status: number; error: string };
const fail = (status: number, error: string): { ok: false; status: number; error: string } => ({ ok: false, status, error });

export interface EndpointView {
  id: number;
  name: string;
  url: string;
  events: WebhookEventType[];
  isActive: boolean;
  disabledReason: string | null;
  consecutiveFailures: number;
  lastSuccessAt: string | null;
  createdAt: string;
}

type EndpointRow = {
  id: number;
  name: string;
  url: string;
  events: unknown;
  isActive: boolean;
  disabledReason: string | null;
  consecutiveFailures: number;
  lastSuccessAt: Date | null;
  createdAt: Date;
};
const ENDPOINT_SELECT = { id: true, name: true, url: true, events: true, isActive: true, disabledReason: true, consecutiveFailures: true, lastSuccessAt: true, createdAt: true } as const;

const toView = (r: EndpointRow): EndpointView => ({
  id: r.id,
  name: r.name,
  url: r.url,
  events: readEvents(r.events),
  isActive: r.isActive,
  disabledReason: r.disabledReason,
  consecutiveFailures: r.consecutiveFailures,
  lastSuccessAt: r.lastSuccessAt?.toISOString() ?? null,
  createdAt: r.createdAt.toISOString(),
});

export async function listEndpoints(db: Db, villageId: number): Promise<EndpointView[]> {
  const rows = await db.webhookEndpoint.findMany({ where: { villageId }, orderBy: { id: "asc" }, select: ENDPOINT_SELECT });
  return rows.map(toView);
}

function parseName(raw: unknown): { ok: true; name: string } | { ok: false; error: string } {
  const name = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  if (!name) return { ok: false, error: "Isi nama tujuan." };
  if (name.length > 100) return { ok: false, error: "Nama terlalu panjang (maksimal 100 huruf)." };
  return { ok: true, name };
}

export async function createEndpoint(db: Db, a: { villageId: number; userId: number | null; name: unknown; url: unknown; events: unknown }): Promise<Result<{ endpoint: EndpointView; secret: string }>> {
  const name = parseName(a.name);
  if (!name.ok) return fail(422, name.error);
  const url = validateWebhookUrl(a.url);
  if (!url.ok) return fail(422, url.error);
  const events = parseEvents(a.events);
  if (!events.ok) return fail(422, events.error);
  if ((await db.webhookEndpoint.count({ where: { villageId: a.villageId } })) >= MAX_ENDPOINTS_PER_VILLAGE) {
    return fail(409, `Sudah ada ${MAX_ENDPOINTS_PER_VILLAGE} tujuan. Hapus yang tidak dipakai untuk menambah yang baru.`);
  }
  const secret = generateWebhookSecret();
  const row = await db.webhookEndpoint.create({
    data: { villageId: a.villageId, name: name.name, url: url.url.toString(), secret, events: events.events, createdById: a.userId },
    select: ENDPOINT_SELECT,
  });
  return { ok: true, data: { endpoint: toView(row), secret } };
}

export interface EndpointPatch {
  name?: unknown;
  url?: unknown;
  events?: unknown;
  isActive?: unknown;
  rotateSecret?: unknown;
}

/** Ubah tujuan. `isActive: true` mengaktifkan kembali dan mengosongkan hitungan gagal. Mengganti rahasia mengembalikan rahasia baru sekali. */
export async function updateEndpoint(db: Db, a: { villageId: number; id: number; patch: EndpointPatch }): Promise<Result<{ endpoint: EndpointView; secret?: string }>> {
  const existing = await db.webhookEndpoint.findFirst({ where: { id: a.id, villageId: a.villageId }, select: { id: true } });
  if (!existing) return fail(404, "Tujuan tidak ditemukan.");
  const p = a.patch;
  const data: Prisma.WebhookEndpointUpdateInput = {};
  if (p.name !== undefined) {
    const n = parseName(p.name);
    if (!n.ok) return fail(422, n.error);
    data.name = n.name;
  }
  if (p.url !== undefined) {
    const u = validateWebhookUrl(p.url);
    if (!u.ok) return fail(422, u.error);
    data.url = u.url.toString();
  }
  if (p.events !== undefined) {
    const e = parseEvents(p.events);
    if (!e.ok) return fail(422, e.error);
    data.events = e.events;
  }
  if (p.isActive !== undefined) {
    if (typeof p.isActive !== "boolean") return fail(422, "Status tidak valid.");
    if (p.isActive) Object.assign(data, { isActive: true, consecutiveFailures: 0, disabledReason: null, disabledAt: null });
    else Object.assign(data, { isActive: false, disabledReason: "Dimatikan oleh admin desa.", disabledAt: new Date() });
  }
  let secret: string | undefined;
  if (p.rotateSecret === true) {
    secret = generateWebhookSecret();
    data.secret = secret;
  }
  const row = await db.webhookEndpoint.update({ where: { id: a.id }, data, select: ENDPOINT_SELECT });
  if (p.isActive === false) await abandonPending(db, a.id, "Tujuan dinonaktifkan.");
  return { ok: true, data: { endpoint: toView(row), secret } };
}

export async function deleteEndpoint(db: Db, a: { villageId: number; id: number }): Promise<boolean> {
  const r = await db.webhookEndpoint.deleteMany({ where: { id: a.id, villageId: a.villageId } });
  return r.count > 0;
}

/** Kejadian yang masih menunggu untuk tujuan yang dimatikan tidak akan dikirim (dan tidak dihidupkan lagi saat tujuan diaktifkan). */
export async function abandonPending(db: Db, endpointId: number, reason: string): Promise<void> {
  await db.webhookDelivery.updateMany({ where: { endpointId, status: "PENDING" }, data: { status: "DEAD", lastError: reason.slice(0, 300) } });
}

/** Masukkan kejadian ke antrean untuk semua tujuan aktif desa yang melanggannya. Mengembalikan jumlah tujuan. */
export async function enqueueEvent(db: Db, a: { villageId: number; type: WebhookEventType; data: Record<string, string | number | null> }): Promise<number> {
  const endpoints = await db.webhookEndpoint.findMany({ where: { villageId: a.villageId, isActive: true }, select: { id: true, events: true } });
  const targets = endpoints.filter((e) => readEvents(e.events).includes(a.type));
  if (!targets.length) return 0;
  const eventId = `evt_${randomUUID()}`;
  // Waktu dari jam aplikasi (bukan bawaan DB) agar pekerja yang jalan sesudahnya pasti menganggapnya jatuh tempo.
  const now = new Date();
  await db.webhookDelivery.createMany({
    data: targets.map((e) => ({ villageId: a.villageId, endpointId: e.id, eventId, eventType: a.type, payload: a.data, nextAttemptAt: now })),
  });
  return targets.length;
}

/** Kejadian uji: dikirim ke SATU tujuan tanpa memeriksa langganan. Mengembalikan id pengiriman. */
export async function enqueueTestEvent(db: Db, a: { villageId: number; endpointId: number }): Promise<bigint | null> {
  const ep = await db.webhookEndpoint.findFirst({ where: { id: a.endpointId, villageId: a.villageId }, select: { id: true } });
  if (!ep) return null;
  const row = await db.webhookDelivery.create({
    data: { villageId: a.villageId, endpointId: ep.id, eventId: `evt_${randomUUID()}`, eventType: TEST_EVENT, payload: { pesan: "Ini kejadian uji dari Klandesa." }, nextAttemptAt: new Date() },
    select: { id: true },
  });
  return row.id;
}

export interface DeliveryView {
  id: string;
  eventType: string;
  status: "PENDING" | "SUCCESS" | "DEAD";
  attempts: number;
  lastStatusCode: number | null;
  lastError: string | null;
  createdAt: string;
  deliveredAt: string | null;
  nextAttemptAt: string | null;
}

export async function listDeliveries(db: Db, a: { villageId: number; endpointId: number; limit?: number }): Promise<DeliveryView[] | null> {
  const ep = await db.webhookEndpoint.findFirst({ where: { id: a.endpointId, villageId: a.villageId }, select: { id: true } });
  if (!ep) return null;
  const rows = await db.webhookDelivery.findMany({
    where: { endpointId: ep.id },
    orderBy: { id: "desc" },
    take: Math.min(Math.max(a.limit ?? 30, 1), 100),
    select: { id: true, eventType: true, status: true, attempts: true, lastStatusCode: true, lastError: true, createdAt: true, deliveredAt: true, nextAttemptAt: true },
  });
  return rows.map((r) => ({
    id: r.id.toString(),
    eventType: r.eventType,
    status: r.status === "SUCCESS" || r.status === "DEAD" ? r.status : "PENDING",
    attempts: r.attempts,
    lastStatusCode: r.lastStatusCode,
    lastError: r.lastError,
    createdAt: r.createdAt.toISOString(),
    deliveredAt: r.deliveredAt?.toISOString() ?? null,
    nextAttemptAt: r.status === "PENDING" ? r.nextAttemptAt.toISOString() : null,
  }));
}

/** Kirim ulang pengiriman yang sudah menyerah (DEAD). Hanya bila tujuannya masih aktif. */
export async function retryDelivery(db: Db, a: { villageId: number; endpointId: number; deliveryId: bigint }): Promise<Result<{ queued: true }>> {
  const row = await db.webhookDelivery.findFirst({
    where: { id: a.deliveryId, endpointId: a.endpointId, villageId: a.villageId },
    select: { id: true, status: true, endpoint: { select: { isActive: true } } },
  });
  if (!row) return fail(404, "Pengiriman tidak ditemukan.");
  if (!row.endpoint.isActive) return fail(409, "Aktifkan tujuan ini lebih dulu.");
  if (row.status !== "DEAD") return fail(409, "Hanya pengiriman yang gagal yang bisa dikirim ulang.");
  await db.webhookDelivery.update({ where: { id: row.id }, data: { status: "PENDING", attempts: 0, nextAttemptAt: new Date(), lastError: null } });
  return { ok: true, data: { queued: true } };
}

export const isSubscribable = isWebhookEvent;
