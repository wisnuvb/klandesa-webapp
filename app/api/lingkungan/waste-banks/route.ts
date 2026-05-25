import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parseWasteBankInput } from "@/lib/lingkungan/schemas";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

function serialize(row: {
  id: number;
  name: string;
  managerName: string | null;
  rt: string | null;
  rw: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  wasteTypes: unknown;
  monthlyKg: number;
  status: string;
}) {
  return { ...row };
}

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const rows = await prisma.wasteBank.findMany({
      where: { villageId: village.id },
      orderBy: [{ name: "asc" }],
    });

    return NextResponse.json({ rows: rows.map(serialize) });
  } catch (e) {
    console.error("GET /api/lingkungan/waste-banks", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = await req.json().catch(() => null);
    const input = parseWasteBankInput(body);
    if (!input) {
      return NextResponse.json({ error: "Data bank sampah tidak valid" }, { status: 400 });
    }

    const created = await prisma.wasteBank.create({
      data: {
        villageId: village.id,
        name: input.name,
        managerName: input.managerName,
        rt: input.rt,
        rw: input.rw,
        address: input.address,
        lat: input.lat,
        lng: input.lng,
        wasteTypes: input.wasteTypes ?? [],
        monthlyKg: input.monthlyKg ?? 0,
        status: input.status ?? "active",
      },
    });

    return NextResponse.json({ ok: true, row: serialize(created) });
  } catch (e) {
    console.error("POST /api/lingkungan/waste-banks", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
