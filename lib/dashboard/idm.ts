export type DashboardIdmSnapshot = {
  configured: boolean;
  year: number;
  villageCode: string;
  cached: boolean;
  sourceUrl: string;
  score: number | null;
  status: string | null;
  subScores: {
    social: number | null;
    economic: number | null;
    ecology: number | null;
  };
  error: string | null;
};

export type DashboardIdmHistoryItem = {
  year: number;
  cached: boolean;
  sourceUrl: string;
  score: number | null;
  status: string | null;
  error: string | null;
};

type IdmCacheValue = {
  data: Omit<DashboardIdmSnapshot, "cached">;
  expiresAt: number;
};

// Data IDM tahun lampau tidak berubah; tahun berjalan jarang berubah; kegagalan dicoba lagi cepat.
const IDM_TTL_PAST_YEAR_MS = 24 * 60 * 60 * 1000;
const IDM_TTL_CURRENT_YEAR_MS = 60 * 60 * 1000;
const IDM_TTL_ERROR_MS = 60 * 1000;
const idmCache = new Map<string, IdmCacheValue>();
const idmInflight = new Map<string, Promise<Omit<DashboardIdmSnapshot, "cached">>>();

function idmTtlMs(year: number, snap: { error: string | null }): number {
  if (snap.error) return IDM_TTL_ERROR_MS;
  return year < new Date().getFullYear() ? IDM_TTL_PAST_YEAR_MS : IDM_TTL_CURRENT_YEAR_MS;
}

export function parseIdmVillageCodeFromSettings(settings: unknown): string {
  if (!settings || typeof settings !== "object" || Array.isArray(settings))
    return "";
  const o = settings as Record<string, unknown>;
  const integrations =
    o.integrations &&
    typeof o.integrations === "object" &&
    !Array.isArray(o.integrations)
      ? (o.integrations as Record<string, unknown>)
      : null;
  const raw =
    typeof integrations?.idmVillageCode === "string"
      ? integrations.idmVillageCode.trim()
      : "";
  return raw;
}

function normalizeIdmNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const s = v.trim().replace(",", ".");
    const n = Number(s);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function extractIdmSnapshot(raw: unknown): {
  score: number | null;
  status: string | null;
  subScores: {
    social: number | null;
    economic: number | null;
    ecology: number | null;
  };
} {
  const knownStatus = [
    "Mandiri",
    "Maju",
    "Berkembang",
    "Tertinggal",
    "Sangat Tertinggal",
  ];

  let score: number | null = null;
  let status: string | null = null;
  let social: number | null = null;
  let economic: number | null = null;
  let ecology: number | null = null;

  const queue: unknown[] = [raw];
  const seen = new Set<unknown>();

  const keyLooksLikeScore = (k: string) =>
    /(skor|score|nilai).*(idm)/i.test(k) ||
    /^idm$/i.test(k) ||
    /^nilai_idm$/i.test(k) ||
    /^skor_idm$/i.test(k);
  const keyLooksLikeSocial = (k: string) =>
    /(iks|ketahanan.*sosial|social)/i.test(k);
  const keyLooksLikeEconomic = (k: string) =>
    /(ike|ketahanan.*ekonomi|economic)/i.test(k);
  const keyLooksLikeEcology = (k: string) =>
    /(ikl|ketahanan.*ekologi|lingkungan|ecology)/i.test(k);
  const keyLooksLikeStatus = (k: string) => /status/i.test(k);

  while (queue.length) {
    const cur = queue.shift();
    if (!cur || typeof cur !== "object") continue;
    if (seen.has(cur)) continue;
    seen.add(cur);

    if (Array.isArray(cur)) {
      for (const it of cur) queue.push(it);
      continue;
    }

    for (const [k, v] of Object.entries(cur as Record<string, unknown>)) {
      if (score === null && keyLooksLikeScore(k)) score = normalizeIdmNumber(v);
      if (social === null && keyLooksLikeSocial(k))
        social = normalizeIdmNumber(v);
      if (economic === null && keyLooksLikeEconomic(k))
        economic = normalizeIdmNumber(v);
      if (ecology === null && keyLooksLikeEcology(k))
        ecology = normalizeIdmNumber(v);

      if (status === null && keyLooksLikeStatus(k) && typeof v === "string") {
        const vv = v.trim();
        const found =
          knownStatus.find((s) => new RegExp(`\\b${s}\\b`, "i").test(vv)) ??
          null;
        if (found) status = found;
      }
      if (status === null && typeof v === "string") {
        const vv = v.trim();
        const found =
          knownStatus.find((s) => new RegExp(`\\b${s}\\b`, "i").test(vv)) ??
          null;
        if (found) status = found;
      }

      if (v && typeof v === "object") queue.push(v);
    }
  }

  return {
    score,
    status,
    subScores: { social, economic, ecology },
  };
}

async function fetchIdmSnapshot(params: {
  villageCode: string;
  year: number;
}): Promise<Omit<DashboardIdmSnapshot, "cached">> {
  const { villageCode, year } = params;
  const sourceUrl = `https://idm.kemendesa.go.id/open/api/desa/rumusan/${encodeURIComponent(
    villageCode,
  )}/${encodeURIComponent(String(year))}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);

  try {
    const res = await fetch(sourceUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        configured: true,
        year,
        villageCode,
        sourceUrl,
        score: null,
        status: null,
        subScores: { social: null, economic: null, ecology: null },
        error: `Gagal memuat IDM (${res.status})`,
      };
    }
    const json = (await res.json().catch(() => null)) as unknown;
    const extracted = extractIdmSnapshot(json);
    const error =
      extracted.score === null && extracted.status === null
        ? "Data IDM tidak ditemukan"
        : null;
    return {
      configured: true,
      year,
      villageCode,
      sourceUrl,
      score: extracted.score,
      status: extracted.status,
      subScores: extracted.subScores,
      error,
    };
  } catch (e) {
    const msg =
      e instanceof Error && e.name === "AbortError"
        ? "Koneksi ke server IDM timeout"
        : e instanceof Error
          ? e.message
          : "Gagal memuat IDM";
    return {
      configured: true,
      year,
      villageCode,
      sourceUrl,
      score: null,
      status: null,
      subScores: { social: null, economic: null, ecology: null },
      error: msg,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function getIdmSnapshotWithCache(params: {
  villageCode: string;
  year: number;
}): Promise<DashboardIdmSnapshot> {
  const { villageCode, year } = params;
  const cacheKey = `idm-${villageCode}-${year}`;
  const cached = idmCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return { ...cached.data, cached: true };
  }
  // Permintaan bersamaan untuk kunci yang sama berbagi satu panggilan ke server IDM.
  let pending = idmInflight.get(cacheKey);
  const joined = Boolean(pending);
  if (!pending) {
    pending = fetchIdmSnapshot({ villageCode, year })
      .then((fresh) => {
        idmCache.set(cacheKey, { data: fresh, expiresAt: Date.now() + idmTtlMs(year, fresh) });
        return fresh;
      })
      .finally(() => idmInflight.delete(cacheKey));
    idmInflight.set(cacheKey, pending);
  }
  return { ...(await pending), cached: joined };
}

export type DashboardIdmResult = {
  idm: DashboardIdmSnapshot;
  idmHistory: DashboardIdmHistoryItem[];
};

/**
 * Snapshot tahun `year` plus riwayat `historySize` tahun terakhir. Semua tahun diambil paralel
 * (snapshot adalah salah satu anggota riwayat), jadi waktu terburuk = satu timeout, bukan dua.
 */
export async function getDashboardIdm(params: {
  villageCode: string;
  year: number;
  historySize: number;
}): Promise<DashboardIdmResult> {
  const { villageCode, year, historySize } = params;
  const years: number[] = [];
  for (let i = historySize - 1; i >= 0; i -= 1) years.push(year - i);

  const snaps = await Promise.all(years.map((y) => getIdmSnapshotWithCache({ villageCode, year: y })));
  const idm = snaps[snaps.length - 1];
  const idmHistory = snaps
    .map(
      (snap) =>
        ({
          year: snap.year,
          cached: snap.cached,
          sourceUrl: snap.sourceUrl,
          score: snap.score,
          status: snap.status,
          error: snap.error,
        }) satisfies DashboardIdmHistoryItem,
    )
    .sort((a, b) => a.year - b.year);
  return { idm, idmHistory };
}
