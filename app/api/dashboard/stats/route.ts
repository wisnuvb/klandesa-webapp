import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateAge } from "@/utils";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { requireVillageApiContext } from "@/lib/api-village-context";

type DashboardIdmSnapshot = {
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

type DashboardIdmHistoryItem = {
  year: number;
  cached: boolean;
  sourceUrl: string;
  score: number | null;
  status: string | null;
  error: string | null;
};

type IdmCacheValue = {
  data: Omit<DashboardIdmSnapshot, "cached">;
  timestamp: number;
};

const IDM_CACHE_MS = 5 * 60 * 1000;
const idmCache = new Map<string, IdmCacheValue>();

function parseIdmVillageCodeFromSettings(settings: unknown): string {
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
  if (cached && Date.now() - cached.timestamp < IDM_CACHE_MS) {
    return { ...cached.data, cached: true };
  }
  const fresh = await fetchIdmSnapshot({ villageCode, year });
  idmCache.set(cacheKey, { data: fresh, timestamp: Date.now() });
  return { ...fresh, cached: false };
}

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const [residents, totalOfficials, totalMailServices, budgets] =
      await Promise.all([
        prisma.resident.findMany({
          where: { villageId: village.id },
          select: { gender: true, birthDate: true, education: true, kk: true },
        }),
        prisma.official.count({ where: { villageId: village.id } }),
        prisma.mailService.count({ where: { villageId: village.id } }),
        prisma.budget.findMany({
          where: { villageId: village.id, status: "active" },
          select: { remainingAmount: true },
        }),
      ]);

    const totalResidents = residents.length;
    const uniqueHouseholds = new Set(
      residents.map((r) => r.kk).filter((kk): kk is string => Boolean(kk)),
    ).size;

    const genderCount = residents.reduce(
      (acc, r) => {
        if (r.gender === "Laki-laki") acc.male += 1;
        else if (r.gender === "Perempuan") acc.female += 1;
        return acc;
      },
      { male: 0, female: 0 },
    );

    const ageBuckets = [
      { name: "0-17", min: 0, max: 17 },
      { name: "18-30", min: 18, max: 30 },
      { name: "31-45", min: 31, max: 45 },
      { name: "46-60", min: 46, max: 60 },
      { name: "60+", min: 61, max: 200 },
    ];
    const ageData = ageBuckets.map((bucket) => ({ ...bucket, value: 0 }));

    const educationMap = new Map<string, number>();

    for (const resident of residents) {
      if (resident.birthDate) {
        const age = calculateAge(new Date(resident.birthDate));
        const bucket = ageData.find((b) => age >= b.min && age <= b.max);
        if (bucket) bucket.value += 1;
      }

      const eduKey = resident.education?.trim() || "Tidak diketahui";
      educationMap.set(eduKey, (educationMap.get(eduKey) ?? 0) + 1);
    }

    const educationData = Array.from(educationMap.entries()).map(
      ([name, value]) => ({
        name,
        value,
      }),
    );

    const budgetAvailable = budgets.reduce(
      (sum, b) => sum + Number(b.remainingAmount ?? 0),
      0,
    );

    const idmVillageCode = parseIdmVillageCodeFromSettings(village.settings);
    const url = new URL(req.url);
    const nowYear = new Date().getFullYear();
    const requestedIdmYear = Number(url.searchParams.get("idmYear") ?? "");
    const year =
      Number.isFinite(requestedIdmYear) &&
      requestedIdmYear >= 2015 &&
      requestedIdmYear <= nowYear
        ? requestedIdmYear
        : nowYear;

    const historySizeRequested = Number(
      url.searchParams.get("idmHistory") ?? "",
    );
    const historySize =
      Number.isFinite(historySizeRequested) &&
      historySizeRequested >= 2 &&
      historySizeRequested <= 10
        ? historySizeRequested
        : 5;

    let idm: DashboardIdmSnapshot = {
      configured: false,
      year,
      villageCode: "",
      cached: false,
      sourceUrl: "",
      score: null,
      status: null,
      subScores: { social: null, economic: null, ecology: null },
      error: null,
    };
    let idmHistory: DashboardIdmHistoryItem[] = [];

    if (idmVillageCode) {
      idm = await getIdmSnapshotWithCache({
        villageCode: idmVillageCode,
        year,
      });

      const historyYears: number[] = [];
      for (let i = historySize - 1; i >= 0; i -= 1) {
        historyYears.push(year - i);
      }
      idmHistory = (
        await Promise.all(
          historyYears.map(async (y) => {
            const snap = await getIdmSnapshotWithCache({
              villageCode: idmVillageCode,
              year: y,
            });
            return {
              year: snap.year,
              cached: snap.cached,
              sourceUrl: snap.sourceUrl,
              score: snap.score,
              status: snap.status,
              error: snap.error,
            } satisfies DashboardIdmHistoryItem;
          }),
        )
      ).sort((a, b) => a.year - b.year);
    }

    return NextResponse.json({
      totals: {
        residents: totalResidents,
        households: uniqueHouseholds,
        officials: totalOfficials,
        mailServices: totalMailServices,
        budgetAvailable,
      },
      charts: {
        gender: [
          { name: "Laki-laki", value: genderCount.male, color: "#0f766e" },
          { name: "Perempuan", value: genderCount.female, color: "#14b8a6" },
        ],
        age: ageData.map(({ name, value }) => ({ name, value })),
        education: educationData,
      },
      statusDesa: {
        idm,
        idmHistory,
        sdgs: {
          dashboardUrl: "https://dashboard-sdgs.kemendesa.go.id/",
        },
      },
    });
  } catch (err) {
    console.error("GET /api/dashboard/stats error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
