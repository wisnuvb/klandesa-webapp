/**
 * Klien tunggal ke API SP2KP Kemendag. Semua pemanggil (cermin data, cron) lewat sini supaya
 * timeout, retry, dan klasifikasi galat seragam.
 *
 * Latar (terukur 2026-11-02 dari VPS produksi): perlambatan 5/10/15/20 detik berasal dari DNS, bukan TCP —
 * TTL record A hanya 30 dtk dan resolver hosting sering macet. Karena itu transport bawaan di sini memakai
 * `node:http(s)` dengan cache DNS (lib/pangan/dns-cache.ts) dan koneksi keep-alive, bukan `fetch` global.
 * Di atas itu: timeout per percobaan + ulang, karena percobaan baru lebih cepat pulih daripada menunggu.
 */
import http from "node:http";
import https from "node:https";
import { sharedDnsCache } from "./dns-cache";

export const SP2KP_BASE = "https://api-sp2kp.kemendag.go.id";

export type Sp2kpErrorKind = "timeout" | "network" | "upstream" | "invalid";

export class Sp2kpError extends Error {
  readonly kind: Sp2kpErrorKind;
  readonly status?: number;
  constructor(kind: Sp2kpErrorKind, message: string, status?: number) {
    super(message);
    this.name = "Sp2kpError";
    this.kind = kind;
    this.status = status;
  }
}

export type Sp2kpBudget = {
  /** Jumlah percobaan total (termasuk yang pertama). */
  attempts: number;
  /** Batas waktu per percobaan. */
  timeoutMs: number;
  /** Jeda dasar sebelum percobaan ulang (dikali nomor percobaan, diberi jitter). */
  backoffMs: number;
};

/** Dipakai saat pengguna menunggu: total terburuk ±7 dtk. */
export const LIVE_BUDGET: Sp2kpBudget = { attempts: 2, timeoutMs: 3_500, backoffMs: 200 };
/** Dipakai saat ada data lama yang bisa jadi cadangan: jangan membuat pengguna menunggu lama. */
export const FOREGROUND_BUDGET: Sp2kpBudget = { attempts: 1, timeoutMs: 3_000, backoffMs: 0 };
/** Dipakai cron: tidak ada yang menunggu, jadi lebih sabar. */
export const SYNC_BUDGET: Sp2kpBudget = { attempts: 3, timeoutMs: 8_000, backoffMs: 500 };

export type Sp2kpRequest = {
  path: string;
  method?: "GET" | "POST";
  form?: Record<string, string>;
  budget?: Sp2kpBudget;
  /** Hanya untuk tes. */
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 8, keepAliveMsecs: 15_000 });
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 8 });

/**
 * Transport bawaan: setara `fetch` untuk kebutuhan di sini (GET, atau POST multipart), tetapi memakai
 * cache DNS bersama dan agen keep-alive. Batas waktu dari `init.signal` mencakup DNS + koneksi + respons.
 */
export const httpFetch = (async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const u = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  const secure = u.protocol === "https:";
  const method = init?.method ?? "GET";
  const headers: Record<string, string> = { accept: "*/*", "user-agent": "node" };

  let payload: Buffer | undefined;
  if (init?.body instanceof FormData) {
    const encoded = new Response(init.body);
    payload = Buffer.from(await encoded.arrayBuffer());
    headers["content-type"] = encoded.headers.get("content-type") ?? "multipart/form-data";
    headers["content-length"] = String(payload.length);
  }

  return new Promise<Response>((resolve, reject) => {
    const mod = secure ? https : http;
    const req = mod.request(
      {
        hostname: u.hostname,
        port: u.port || (secure ? 443 : 80),
        path: u.href.slice(u.origin.length), // pertahankan '?' di ujung seperti yang dikirim kode lama
        method,
        headers,
        agent: secure ? httpsAgent : httpAgent,
        lookup: sharedDnsCache().lookup,
        signal: init?.signal ?? undefined,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("error", reject);
        res.on("end", () => {
          const status = res.statusCode ?? 502;
          const body = status === 204 || status === 205 || status === 304 ? null : Buffer.concat(chunks);
          resolve(new Response(body, { status }));
        });
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}) as typeof fetch;

function isRetryable(e: Sp2kpError): boolean {
  if (e.kind === "timeout" || e.kind === "network") return true;
  if (e.kind === "upstream") return e.status === 429 || (e.status ?? 0) >= 500;
  return false;
}

async function attemptOnce(
  req: Sp2kpRequest,
  timeoutMs: number,
): Promise<Record<string, unknown>> {
  const doFetch = req.fetchImpl ?? httpFetch;
  const method = req.method ?? "GET";
  let body: FormData | undefined;
  if (method === "POST" && req.form) {
    body = new FormData();
    for (const [k, v] of Object.entries(req.form)) body.append(k, v);
  }

  let res: Response;
  let text: string;
  try {
    res = await doFetch(`${SP2KP_BASE}${req.path}`, {
      method,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    text = await res.text();
  } catch (e) {
    const name = (e as { name?: string } | null)?.name;
    // Gagal/lambat: minta DNS disegarkan di latar belakang (alamat lama tetap dipakai sampai ada yang baru).
    if (!req.fetchImpl) sharedDnsCache().refresh(new URL(SP2KP_BASE).hostname);
    if (name === "TimeoutError" || name === "AbortError") {
      throw new Sp2kpError("timeout", `Tidak ada respons dalam ${timeoutMs} ms`);
    }
    throw new Sp2kpError("network", "Gagal terhubung ke server sumber");
  }

  if (!res.ok) {
    throw new Sp2kpError("upstream", `Sumber membalas HTTP ${res.status}`, res.status);
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Sp2kpError("invalid", "Respons sumber bukan JSON");
  }
  if (!json || typeof json !== "object" || Array.isArray(json) || !("data" in json)) {
    throw new Sp2kpError("invalid", "Bentuk respons sumber tidak dikenali");
  }
  const status = (json as { status?: unknown }).status;
  if (typeof status === "string" && status !== "success") {
    throw new Sp2kpError("invalid", `Status sumber: ${status.slice(0, 60)}`);
  }
  return json as Record<string, unknown>;
}

/** Panggil SP2KP dengan timeout per percobaan dan retry berjitter. Melempar `Sp2kpError`. */
export async function sp2kpJson(req: Sp2kpRequest): Promise<Record<string, unknown>> {
  const budget = req.budget ?? LIVE_BUDGET;
  const sleep = req.sleepImpl ?? defaultSleep;
  let last: Sp2kpError | null = null;

  for (let attempt = 1; attempt <= budget.attempts; attempt++) {
    try {
      return await attemptOnce(req, budget.timeoutMs);
    } catch (e) {
      last = e instanceof Sp2kpError ? e : new Sp2kpError("network", "Galat tak terduga");
      if (!isRetryable(last) || attempt === budget.attempts) break;
      const jitter = 0.5 + Math.random();
      await sleep(Math.round(budget.backoffMs * attempt * jitter));
    }
  }
  throw last ?? new Sp2kpError("network", "Gagal terhubung ke server sumber");
}
