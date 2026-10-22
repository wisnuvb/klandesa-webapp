import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { readCitizenSignupMode } from "@/lib/mobile/citizen";
import { checkMobileRateLimit, clientIp } from "@/lib/mobile/rate-limit";
import { isVillageSubscriptionReadable } from "@/lib/subscription";

/** Publik: cari desa untuk pendaftaran. Hanya desa aktif dan berlangganan; tidak membuka data sensitif. */
export async function GET(req: NextRequest) {
  const rl = checkMobileRateLimit(`vsearch:${clientIp(req)}`, { max: 40, windowMs: 60_000 });
  if (!rl.ok) return mobileError("RATE_LIMITED", "Terlalu banyak pencarian. Coba lagi sebentar.", 429, { retryAfterSec: rl.retryAfterSec });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 3) return NextResponse.json({ items: [] });

  const rows = await prisma.village.findMany({
    where: {
      isActive: true,
      OR: [{ name: { contains: q } }, { district: { contains: q } }],
    },
    select: {
      id: true, name: true, district: true, regency: true, logoUrl: true, settings: true,
      subscriptionStatus: true, subscriptionExpiry: true,
    },
    orderBy: { name: "asc" },
    take: 30,
  });
  const items = rows
    .filter((v) => isVillageSubscriptionReadable(v))
    .slice(0, 10)
    .map((v) => ({
      id: v.id, name: v.name, district: v.district, regency: v.regency, logoUrl: v.logoUrl,
      signupMode: readCitizenSignupMode(v.settings),
    }));
  return NextResponse.json({ items });
}
