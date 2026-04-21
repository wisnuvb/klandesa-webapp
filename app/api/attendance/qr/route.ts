import { getApiSession } from "@/lib/api-session";
import { NextRequest, NextResponse } from "next/server";
import { resolveVillage } from "@/lib/village";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

function getOrigin(req: NextRequest) {
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) return `${proto}://${host}`;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  return "http://localhost:3000";
}

export async function GET(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    const url = new URL(req.url);
    const villageCode = url.searchParams.get("villageCode") ?? undefined;

    const village = await resolveVillage({
      req,
      queryVillageCode: villageCode,
      session,
    });

    if (!village) {
      return NextResponse.json(
        {
          error:
            "Tidak ada desa yang tersedia. Login terlebih dahulu atau atur DEFAULT_VILLAGE_CODE di env.",
        },
        { status: 404 }
      );
    }
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const secret = process.env.AUTH_SECRET ?? "your-secret-key";
    const expiresInSeconds = 60 * 5;

    const token = jwt.sign(
      {
        type: "ATTENDANCE_QR",
        villageId: village.id,
        villageCode: village.code,
      },
      secret,
      { expiresIn: expiresInSeconds }
    );

    const origin = getOrigin(req);
    const scanUrl = `${origin}/api/attendance/scan?token=${encodeURIComponent(
      token
    )}`;

    const totalActive = await prisma.official.count({
      where: { villageId: village.id, status: "active" },
    });

    return NextResponse.json({
      scanUrl,
      expiresInSeconds,
      meta: {
        villageId: village.id,
        villageCode: village.code,
        activeOfficials: totalActive,
      },
    });
  } catch (error) {
    console.error("GET /api/attendance/qr error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
