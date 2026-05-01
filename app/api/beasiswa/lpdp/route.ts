import { NextRequest, NextResponse } from "next/server";
import { checkRegionalRateLimit } from "@/lib/regional-rate-limit";
import { getLpdpOpenScholarshipsSnapshot } from "@/lib/scholarships/lpdp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function withCors(res: NextResponse): NextResponse {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET(req: NextRequest) {
  const rl = checkRegionalRateLimit(clientIp(req), "beasiswa_lpdp", {
    maxRequests: 90,
  });
  if (!rl.ok) {
    return withCors(
      NextResponse.json(
        { error: "Terlalu banyak permintaan, coba lagi nanti." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      ),
    );
  }

  try {
    const snapshot = await getLpdpOpenScholarshipsSnapshot();
    const status = snapshot.items.length > 0 ? 200 : 503;
    const res = NextResponse.json(snapshot, { status });
    res.headers.set(
      "Cache-Control",
      "public, max-age=0, s-maxage=600, stale-while-revalidate=3600",
    );
    return withCors(res);
  } catch (e) {
    return withCors(
      NextResponse.json(
        { error: e instanceof Error ? e.message : "Gagal memuat beasiswa" },
        { status: 500 },
      ),
    );
  }
}

