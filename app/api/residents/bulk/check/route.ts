import { requireVillageApiContext } from "@/lib/api-village-context";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_NIKS = 5000;

/** Pra-periksa impor: NIK mana yang sudah terdaftar di desa ini (dipanggil per potongan ≤5000 NIK). */
export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const body = await req.json();
    const niks: string[] = Array.isArray(body?.niks)
      ? [...new Set<string>(body.niks.filter((n: unknown): n is string => typeof n === "string" && /^\d{16}$/.test(n)))]
      : [];
    if (niks.length === 0) return NextResponse.json({ existing: [] });
    if (niks.length > MAX_NIKS) {
      return NextResponse.json({ error: `Maksimal ${MAX_NIKS} NIK per permintaan` }, { status: 400 });
    }
    const found = await prisma.resident.findMany({
      where: { villageId: village.id, nik: { in: niks } },
      select: { nik: true },
    });
    return NextResponse.json({ existing: found.map((f) => f.nik) });
  } catch (err) {
    console.error("POST /api/residents/bulk/check error:", err);
    return NextResponse.json({ error: "Gagal memeriksa data yang sudah ada" }, { status: 500 });
  }
}
