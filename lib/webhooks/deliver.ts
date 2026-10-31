/**
 * Mesin pengirim webhook: mengambil pengiriman yang jatuh tempo, menandatangani, mengirim, lalu mencatat hasil.
 * Aman dijalankan bersamaan dari beberapa proses: setiap baris "diklaim" dengan menggeser `nextAttemptAt` secara bersyarat.
 * Respons penerima tidak disimpan (hanya kode status), supaya tidak ada data asing masuk ke database kita.
 */
import http from "node:http";
import https from "node:https";
import type { LookupFunction } from "node:net";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { WebhookEventType } from "./events";
import { signatureHeader } from "./sign";
import { enqueueEvent, abandonPending, AUTO_DISABLE_AFTER_FAILURES, BACKOFF_MINUTES, DELIVERY_RETENTION_DAYS, MAX_ATTEMPTS } from "./service";
import { BlockedAddressError, guardedLookup, validateWebhookUrl } from "./url-guard";

type Db = Prisma.TransactionClient;

const REQUEST_TIMEOUT_MS = 8_000;
/** Batas TOTAL satu pengiriman (soket yang meneteskan data tiap beberapa detik tidak memicu batas idle). */
const TOTAL_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 64 * 1024;
const CLAIM_LEASE_MS = 5 * 60_000;
const CONCURRENCY = 5;

export interface SendResult {
  statusCode: number | null;
  error: string | null;
}
export type Sender = (url: string, headers: Record<string, string>, body: string) => Promise<SendResult>;

function describeError(e: unknown): string {
  if (e instanceof BlockedAddressError) return "Alamat mengarah ke jaringan internal dan ditolak.";
  const code = (e as { code?: string })?.code ?? "";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "Alamat tidak ditemukan (DNS).";
  if (code === "ECONNREFUSED") return "Koneksi ditolak oleh server tujuan.";
  if (code === "ECONNRESET" || code === "EPIPE") return "Koneksi terputus.";
  if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT") return "Server tujuan terlalu lama menjawab.";
  if (/CERT|SSL|TLS|SELF_SIGNED|ERR_TLS/i.test(code)) return "Sertifikat HTTPS server tujuan tidak sah.";
  return "Gagal tersambung ke server tujuan.";
}

/** Kirim POST JSON. Tidak mengikuti pengalihan (redirect) dan memeriksa IP saat tersambung (anti SSRF). */
export const postWebhook: Sender = (rawUrl, headers, body) =>
  new Promise((resolve) => {
    const check = validateWebhookUrl(rawUrl);
    if (!check.ok) return resolve({ statusCode: null, error: check.error });
    const url = check.url;
    const mod = url.protocol === "https:" ? https : http;
    let done = false;
    const finish = (r: SendResult) => {
      if (done) return;
      done = true;
      resolve(r);
    };
    const req = mod.request(
      url,
      { method: "POST", headers: { ...headers, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), "User-Agent": "Klandesa-Webhook/1" }, lookup: guardedLookup as unknown as LookupFunction, timeout: REQUEST_TIMEOUT_MS },
      (res) => {
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_RESPONSE_BYTES) {
            // Status sudah diterima; sisa isi tidak diperlukan dan tidak boleh ditampung.
            finish({ statusCode: res.statusCode ?? null, error: null });
            res.destroy();
          }
        });
        res.on("end", () => finish({ statusCode: res.statusCode ?? null, error: null }));
        res.on("error", (e) => finish({ statusCode: null, error: describeError(e) }));
      },
    );
    req.on("timeout", () => req.destroy(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })));
    req.on("error", (e) => finish({ statusCode: null, error: describeError(e) }));
    const timer = setTimeout(() => req.destroy(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })), TOTAL_TIMEOUT_MS);
    timer.unref?.();
    req.on("close", () => clearTimeout(timer));
    req.end(body);
  });

export const isSuccessStatus = (s: number | null) => s != null && s >= 200 && s < 300;
export const backoffMs = (attemptsDone: number): number | null => (attemptsDone >= MAX_ATTEMPTS ? null : BACKOFF_MINUTES[attemptsDone - 1] * 60_000);

interface Claimed {
  id: bigint;
  eventId: string;
  eventType: string;
  payload: unknown;
  attempts: number;
  createdAt: Date;
  endpoint: { id: number; url: string; secret: string };
}

async function attempt(db: Db, d: Claimed, send: Sender, opts: { retry: boolean; now: Date }): Promise<"SUCCESS" | "PENDING" | "DEAD"> {
  const body = JSON.stringify({ id: d.eventId, type: d.eventType, createdAt: d.createdAt.toISOString(), data: d.payload });
  const ts = Math.floor(opts.now.getTime() / 1000);
  const headers = {
    "X-Klandesa-Event": d.eventType,
    "X-Klandesa-Event-Id": d.eventId,
    "X-Klandesa-Delivery": d.id.toString(),
    "X-Klandesa-Signature": signatureHeader(d.endpoint.secret, ts, body),
  };
  let result: SendResult;
  try {
    result = await send(d.endpoint.url, headers, body);
  } catch (e) {
    result = { statusCode: null, error: describeError(e) };
  }
  const attempts = d.attempts + 1;

  if (isSuccessStatus(result.statusCode)) {
    await db.webhookDelivery.update({
      where: { id: d.id },
      data: { status: "SUCCESS", attempts, lastStatusCode: result.statusCode, lastError: null, deliveredAt: new Date() },
    });
    await db.webhookEndpoint.update({ where: { id: d.endpoint.id }, data: { consecutiveFailures: 0, lastSuccessAt: new Date() } });
    return "SUCCESS";
  }

  const error = (result.error ?? `Server tujuan menjawab dengan kode ${result.statusCode}.`).slice(0, 300);
  const wait = opts.retry ? backoffMs(attempts) : null;
  // 410 Gone = penerima meminta berhenti; 4xx lain (selain 408/429) tidak akan membaik dengan dikirim ulang.
  const permanent = result.statusCode != null && result.statusCode >= 400 && result.statusCode < 500 && ![408, 425, 429].includes(result.statusCode);
  const status = wait == null || permanent ? "DEAD" : "PENDING";
  await db.webhookDelivery.update({
    where: { id: d.id },
    data: { status, attempts, lastStatusCode: result.statusCode, lastError: error, nextAttemptAt: status === "PENDING" ? new Date(opts.now.getTime() + wait!) : undefined },
  });
  const ep = await db.webhookEndpoint.update({ where: { id: d.endpoint.id }, data: { consecutiveFailures: { increment: 1 } }, select: { consecutiveFailures: true } });
  if (result.statusCode === 410 || ep.consecutiveFailures >= AUTO_DISABLE_AFTER_FAILURES) {
    const reason = result.statusCode === 410 ? "Server tujuan menjawab 410 (berhenti berlangganan)." : `Dimatikan otomatis setelah ${AUTO_DISABLE_AFTER_FAILURES} kegagalan berturut-turut.`;
    await db.webhookEndpoint.update({ where: { id: d.endpoint.id }, data: { isActive: false, disabledReason: reason, disabledAt: new Date() } });
    await abandonPending(db, d.endpoint.id, "Tujuan dinonaktifkan.");
  }
  return status;
}

const CLAIM_SELECT = {
  id: true,
  eventId: true,
  eventType: true,
  payload: true,
  attempts: true,
  createdAt: true,
  nextAttemptAt: true,
  endpoint: { select: { id: true, url: true, secret: true, isActive: true } },
} as const;

/** Klaim satu pengiriman (bersyarat pada `nextAttemptAt` agar dua proses tidak mengirim ganda). */
async function claim(db: Db, id: bigint, expectedNext: Date, now: Date): Promise<boolean> {
  const r = await db.webhookDelivery.updateMany({
    where: { id, status: "PENDING", nextAttemptAt: expectedNext },
    data: { nextAttemptAt: new Date(now.getTime() + CLAIM_LEASE_MS) },
  });
  return r.count === 1;
}

export interface ProcessSummary {
  due: number;
  success: number;
  retrying: number;
  dead: number;
}

export async function processDue(db: Db, opts: { limit?: number; now?: Date; send?: Sender } = {}): Promise<ProcessSummary> {
  const now = opts.now ?? new Date();
  const send = opts.send ?? postWebhook;
  const rows = await db.webhookDelivery.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: now }, endpoint: { isActive: true } },
    orderBy: { nextAttemptAt: "asc" },
    take: Math.min(Math.max(opts.limit ?? 20, 1), 200),
    select: CLAIM_SELECT,
  });
  const summary: ProcessSummary = { due: rows.length, success: 0, retrying: 0, dead: 0 };
  let i = 0;
  const worker = async () => {
    while (i < rows.length) {
      const row = rows[i++];
      try {
        if (!(await claim(db, row.id, row.nextAttemptAt, now))) continue;
        const r = await attempt(db, row, send, { retry: true, now });
        if (r === "SUCCESS") summary.success++;
        else if (r === "PENDING") summary.retrying++;
        else summary.dead++;
      } catch (e) {
        console.error("[webhook] gagal memproses pengiriman:", e instanceof Error ? e.message : e);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, worker));
  return summary;
}

/** Kirim satu pengiriman SEKARANG tanpa percobaan ulang (untuk tombol "Kirim uji"). */
export async function sendNow(db: Db, deliveryId: bigint, send: Sender = postWebhook): Promise<{ status: "SUCCESS" | "DEAD"; statusCode: number | null; error: string | null } | null> {
  const row = await db.webhookDelivery.findUnique({ where: { id: deliveryId }, select: CLAIM_SELECT });
  if (!row || !(await claim(db, row.id, row.nextAttemptAt, new Date()))) return null;
  const r = await attempt(db, row, send, { retry: false, now: new Date() });
  const after = await db.webhookDelivery.findUnique({ where: { id: deliveryId }, select: { lastStatusCode: true, lastError: true } });
  return { status: r === "SUCCESS" ? "SUCCESS" : "DEAD", statusCode: after?.lastStatusCode ?? null, error: after?.lastError ?? null };
}

export async function purgeOldDeliveries(db: Db, now = new Date()): Promise<number> {
  const r = await db.webhookDelivery.deleteMany({ where: { status: { in: ["SUCCESS", "DEAD"] }, createdAt: { lt: new Date(now.getTime() - DELIVERY_RETENTION_DAYS * 86_400_000) } } });
  return r.count;
}

/**
 * Titik panggil dari fitur lain: setelah data tersimpan (di luar transaksi), umumkan kejadian. TIDAK PERNAH melempar galat
 * dan tidak menunggu pengiriman, sehingga webhook yang bermasalah tidak bisa menggagalkan pekerjaan operator.
 */
export function emitWebhookEvent(villageId: number, type: WebhookEventType, data: Record<string, string | number | null>): void {
  void (async () => {
    try {
      const n = await enqueueEvent(prisma, { villageId, type, data });
      if (n > 0) await processDue(prisma, { limit: 10 });
    } catch (e) {
      console.error(`[webhook] gagal mengantrekan ${type}:`, e instanceof Error ? e.message : e);
    }
  })();
}
