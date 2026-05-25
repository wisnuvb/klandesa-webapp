import { createHash } from "node:crypto";

export const LPDP_OPEN_SCHOLARSHIPS_SOURCE_URL = "https://lpdp.kemenkeu.go.id/";
export const LPDP_OPEN_SCHOLARSHIPS_API_URL =
  "https://lpdp-belakang.kemenkeu.go.id/api/frontend/scholarship/active-scholarship-programs";

export type LpdpScholarshipStatus = "open" | "last_day" | "closed";

export type LpdpScholarshipItem = {
  id: string;
  /** Kategori dari API (Beasiswa, Riset, …); kosong jika respons format lama. */
  category: string;
  title: string;
  description: string;
  requirements: string[];
  level: string;
  provider: string;
  deadlineDate: string | null;
  deadlineAt: string | null;
  daysLeft: number | null;
  status: LpdpScholarshipStatus;
  statusLabel: string;
  sourceUrl: string;
  /** URL pendaftaran dari API atau portal default */
  applyUrl: string;
};

export type LpdpScholarshipsSnapshot = {
  sourceUrl: string;
  fetchedAt: string;
  cached: boolean;
  stale: boolean;
  items: LpdpScholarshipItem[];
  error?: string;
};

export const DEFAULT_LPDP_APPLY_URL =
  "https://beasiswalpdp-terintegrasi.kemenkeu.go.id/login";

type LpdpScholarshipProgramRaw = {
  jenjang?: unknown;
  jenis_program?: unknown;
  instansi_string?: unknown;
  deskripsi?: unknown;
  deadline_pendaftaran?: unknown;
  deadline_pendaftaran_hari?: unknown;
  jam_tutup?: unknown;
  status_pendaftaran?: unknown;
  status?: unknown;
  label_status?: unknown;
  link_detail?: unknown;
  link_apply?: unknown;
};

type LpdpCategoryBucketRaw = {
  nama_kategori?: unknown;
  data?: unknown;
};

type LpdpApiResponse = {
  code?: unknown;
  success?: unknown;
  data?: unknown;
  meta?: { code?: unknown; message?: unknown } | unknown;
  message?: unknown;
};

type CacheState = {
  data: LpdpScholarshipItem[];
  fetchedAtMs: number;
  lastError: string | null;
  refreshInFlight: Promise<void> | null;
  intervalStarted: boolean;
};

const CACHE_TTL_MS = 10 * 60_000;
const AUTO_REFRESH_MS = 15 * 60_000;

const GLOBAL_KEY = "__klandesa_lpdp_scholarships_cache__";

function getState(): CacheState {
  const g = globalThis as unknown as Record<string, unknown>;
  const existing = g[GLOBAL_KEY] as CacheState | undefined;
  if (existing) return existing;
  const created: CacheState = {
    data: [],
    fetchedAtMs: 0,
    lastError: null,
    refreshInFlight: null,
    intervalStarted: false,
  };
  g[GLOBAL_KEY] = created;
  return created;
}

function stableId(parts: string[]): string {
  const h = createHash("sha256");
  h.update(parts.join("|"));
  return h.digest("hex").slice(0, 24);
}

function asTrimmedString(v: unknown): string {
  return typeof v === "string" ? v.trim() : String(v ?? "").trim();
}

function parseDaysLeft(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function computeStatus(
  daysLeft: number | null,
  label: string,
): {
  status: LpdpScholarshipStatus;
  statusLabel: string;
} {
  const normalized = label.trim();
  if (normalized) {
    const l = normalized.toLowerCase();
    if (l.includes("ditutup")) return { status: "closed", statusLabel: label };
    if (l.includes("terakhir"))
      return { status: "last_day", statusLabel: label };
    if (l.includes("dibuka")) return { status: "open", statusLabel: label };
  }
  if (daysLeft === null)
    return { status: "open", statusLabel: "Sedang Dibuka" };
  if (daysLeft < 0) return { status: "closed", statusLabel: "Ditutup" };
  if (daysLeft === 0)
    return { status: "last_day", statusLabel: "Terakhir hari ini" };
  return { status: "open", statusLabel: "Sedang Dibuka" };
}

function toJakartaISO(dateStr: string, timeStr: string): string | null {
  const d = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const t = timeStr.trim();
  const hhmm = /^\d{2}:\d{2}$/.test(t) ? t : "00:00";
  return `${d}T${hhmm}:00+07:00`;
}

function looksLikeProgramRow(r: unknown): r is Record<string, unknown> {
  return (
    r !== null &&
    typeof r === "object" &&
    "jenis_program" in r &&
    typeof (r as LpdpScholarshipProgramRaw).jenis_program !== "undefined"
  );
}

function resolveSourceUrl(linkDetail: string): string {
  if (linkDetail && /^https?:\/\//i.test(linkDetail)) return linkDetail;
  return LPDP_OPEN_SCHOLARSHIPS_SOURCE_URL;
}

function resolveApplyUrl(linkApply: string): string {
  if (linkApply && /^https?:\/\//i.test(linkApply)) return linkApply;
  return DEFAULT_LPDP_APPLY_URL;
}

function flattenLpdpProgramRows(payloadData: unknown[]): Array<{
  category: string;
  program: LpdpScholarshipProgramRaw;
}> {
  const out: Array<{ category: string; program: LpdpScholarshipProgramRaw }> =
    [];

  for (const item of payloadData) {
    if (looksLikeProgramRow(item)) {
      out.push({ category: "", program: item as LpdpScholarshipProgramRaw });
      continue;
    }
    const bucket = item as LpdpCategoryBucketRaw;
    const cat = asTrimmedString(bucket.nama_kategori);
    const programs = Array.isArray(bucket.data) ? bucket.data : [];
    for (const p of programs) {
      if (!looksLikeProgramRow(p)) continue;
      out.push({
        category: cat,
        program: p as LpdpScholarshipProgramRaw,
      });
    }
  }

  return out;
}

function mapProgramRow(
  category: string,
  x: LpdpScholarshipProgramRaw,
): LpdpScholarshipItem {
  const level = asTrimmedString(x.jenjang) || "—";
  const title = asTrimmedString(x.jenis_program) || "Program Beasiswa";
  const provider = asTrimmedString(x.instansi_string) || "LPDP";
  const description = asTrimmedString(x.deskripsi) || "—";
  const deadlineDate = asTrimmedString(x.deadline_pendaftaran) || "";
  const deadlineAt = toJakartaISO(deadlineDate, asTrimmedString(x.jam_tutup));
  const daysLeft = parseDaysLeft(x.deadline_pendaftaran_hari);

  const label =
    asTrimmedString(x.status_pendaftaran) ||
    asTrimmedString(x.status) ||
    asTrimmedString(x.label_status);

  const { status, statusLabel } = computeStatus(daysLeft, label);

  const linkDetail = asTrimmedString(x.link_detail);
  const linkApply = asTrimmedString(x.link_apply);
  const sourceUrl = resolveSourceUrl(linkDetail);
  const applyUrl = resolveApplyUrl(linkApply);

  const requirements: string[] = [];
  if (level && level !== "—") requirements.push(`Jenjang: ${level}`);
  if (provider) requirements.push(`Instansi: ${provider}`);

  return {
    id: stableId([
      category,
      title,
      provider,
      deadlineDate,
      description.slice(0, 120),
    ]),
    category,
    title,
    description,
    requirements,
    level,
    provider,
    deadlineDate: deadlineDate || null,
    deadlineAt,
    daysLeft,
    status,
    statusLabel,
    sourceUrl,
    applyUrl,
  };
}

export function normalizeLpdpOpenScholarships(
  raw: unknown,
): LpdpScholarshipItem[] {
  const payload = raw as LpdpApiResponse;
  const arr = Array.isArray(payload?.data) ? (payload.data as unknown[]) : [];

  return flattenLpdpProgramRows(arr).map(({ category, program }) =>
    mapProgramRow(category, program),
  );
}

async function fetchLpdpOpenScholarshipsFromUpstream(): Promise<
  LpdpScholarshipItem[]
> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(LPDP_OPEN_SCHOLARSHIPS_API_URL, {
      method: "GET",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; KlandesaBot/1.0; +https://klandesa.com)",
        accept: "application/json,text/plain,*/*",
        "accept-language": "id-ID,id;q=0.9,en;q=0.8",
      },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Upstream HTTP ${res.status}`);
    const json = (await res.json().catch(() => null)) as unknown;
    const items = normalizeLpdpOpenScholarships(json);
    return items;
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshLpdpOpenScholarships(state: CacheState): Promise<void> {
  if (state.refreshInFlight) return state.refreshInFlight;
  state.refreshInFlight = (async () => {
    try {
      const next = await fetchLpdpOpenScholarshipsFromUpstream();
      state.data = next;
      state.fetchedAtMs = Date.now();
      state.lastError = null;
    } catch (e) {
      state.lastError = e instanceof Error ? e.message : "Gagal memuat data";
    } finally {
      state.refreshInFlight = null;
    }
  })();
  return state.refreshInFlight;
}

function ensureAutoRefresh(): void {
  const state = getState();
  if (state.intervalStarted) return;
  state.intervalStarted = true;
  setInterval(() => {
    const s = getState();
    void refreshLpdpOpenScholarships(s);
  }, AUTO_REFRESH_MS).unref?.();
}

export async function getLpdpOpenScholarshipsSnapshot(opts?: {
  forceRefresh?: boolean;
}): Promise<LpdpScholarshipsSnapshot> {
  ensureAutoRefresh();
  const state = getState();

  const fresh =
    state.data.length > 0 && Date.now() - state.fetchedAtMs < CACHE_TTL_MS;

  if (opts?.forceRefresh || !fresh) {
    await refreshLpdpOpenScholarships(state);
  }

  const hasData = state.data.length > 0;
  const isFresh =
    hasData &&
    Date.now() - state.fetchedAtMs < CACHE_TTL_MS &&
    !state.lastError;

  return {
    sourceUrl: LPDP_OPEN_SCHOLARSHIPS_SOURCE_URL,
    fetchedAt: state.fetchedAtMs
      ? new Date(state.fetchedAtMs).toISOString()
      : "",
    cached: hasData,
    stale: hasData && !isFresh,
    items: state.data,
    ...(state.lastError ? { error: state.lastError } : {}),
  };
}
