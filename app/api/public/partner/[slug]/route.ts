import { NextRequest, NextResponse } from "next/server";
import { resolvePartnerPublicProfile } from "@/lib/partner/public-page";
import { checkRegionalRateLimit } from "@/lib/regional-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const ip = clientIp(req);
  const rl = checkRegionalRateLimit(ip, "partner_public_page", {
    maxRequests: 120,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const { slug } = await context.params;
  const profile = await resolvePartnerPublicProfile(slug);
  if (!profile) {
    return NextResponse.json({ error: "Halaman mitra tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json(
    {
      profile: {
        slug: profile.slug,
        referralCode: profile.referralCode,
        name: profile.name,
        region: profile.region,
        publicHeadline: profile.publicHeadline,
        publicBio: profile.publicBio,
        publicWhatsapp: profile.publicWhatsapp,
        acquiredVillageCount: profile.acquiredVillageCount,
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
