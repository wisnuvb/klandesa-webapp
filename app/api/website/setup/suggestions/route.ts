import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { requireVillageAdminResponse } from "@/lib/access-policy";

/** Angka ringkas dari data kependudukan untuk mengisi beranda; desa tetap bisa mengubahnya sebelum terbit. */
export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const forbidden = requireVillageAdminResponse(loaded.ctx.session);
    if (forbidden) return forbidden;
    const villageId = loaded.ctx.village.id;

    const [total, households, hamlets] = await Promise.all([
      prisma.resident.count({ where: { villageId } }),
      prisma.$queryRaw<Array<{ n: bigint | number }>>(Prisma.sql`
        SELECT COUNT(DISTINCT NULLIF(kk, '')) AS n FROM residents WHERE villageId = ${villageId}
      `),
      prisma.$queryRaw<Array<{ n: bigint | number }>>(Prisma.sql`
        SELECT COUNT(DISTINCT NULLIF(TRIM(hamlet), '')) AS n FROM residents WHERE villageId = ${villageId}
      `),
    ]);

    return NextResponse.json({
      residents: {
        total,
        households: Number(households[0]?.n ?? 0),
        hamlets: Number(hamlets[0]?.n ?? 0),
      },
    });
  } catch (e) {
    console.error("GET /api/website/setup/suggestions error:", e);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
