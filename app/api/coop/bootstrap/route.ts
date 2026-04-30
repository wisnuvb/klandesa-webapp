import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toJSONSafe } from "@/utils/json";
import { loadCoopApiContextElevated } from "@/lib/coop/api-context";

export async function POST(req: NextRequest) {
  const loaded = await loadCoopApiContextElevated(req);
  if (!loaded.ok) return loaded.response;

  const { village } = loaded.ctx;
  const existing = await prisma.cooperative.findUnique({
    where: { villageId: village.id },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Koperasi untuk desa ini sudah ada", data: toJSONSafe(existing) },
      { status: 409 },
    );
  }

  let name = `Koperasi Desa ${village.name}`;
  try {
    const body = await req.json();
    if (body?.name && typeof body.name === "string" && body.name.trim()) {
      name = body.name.trim().slice(0, 255);
    }
  } catch {
    /* body opsional */
  }

  const cooperative = await prisma.cooperative.create({
    data: {
      villageId: village.id,
      name,
      address: village.address,
      phone: village.phone ?? undefined,
      email: village.email ?? undefined,
    },
  });

  return NextResponse.json({
    success: true,
    data: toJSONSafe(cooperative),
    message: "Koperasi berhasil dibuat",
  });
}
