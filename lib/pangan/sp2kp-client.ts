/**
 * Klien tunggal ke API SP2KP Kemendag. Semua pemanggil (cermin data, cron) lewat sini supaya
 * timeout, retry, dan klasifikasi galat seragam.
 *
 * Latar: dari VPS, paket SYN ke api-sp2kp.kemendag.go.id kadang hilang (connect 5 dtk, sesekali
 * >10 dtk). Tanpa timeout sendiri, `fetch` menunggu 10 dtk lalu gagal. Percobaan baru = soket baru,
 * jadi timeout pendek + ulang jauh lebih cepat pulih daripada menunggu satu soket.
 */

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

function isRetryable(e: Sp2kpError): boolean {
  if (e.kind === "timeout" || e.kind === "network") return true;
  if (e.kind === "upstream") return e.status === 429 || (e.status ?? 0) >= 500;
  return false;
}

async function attemptOnce(
  req: Sp2kpRequest,
  timeoutMs: number,
): Promise<Record<string, unknown>> {
  const doFetch = req.fetchImpl ?? fetch;
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
