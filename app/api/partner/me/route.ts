import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiSession } from "@/lib/api-session";
import { getPartnerSession } from "@/lib/partner-session";

const MAX_LEN = {
  name: 255,
  phone: 40,
  region: 200,
} as const;

export async function GET(req: NextRequest) {
  const session = await getApiSession(req);
  const partner = getPartnerSession(session);
  if (!partner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.partner.findUnique({
    where: { id: partner.partnerId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      region: true,
      status: true,
    },
  });

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ partner: row }, { status: 200 });
}

export async function PUT(req: NextRequest) {
  const session = await getApiSession(req);
  const partner = getPartnerSession(session);
  if (!partner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { name?: unknown; phone?: unknown; region?: unknown }
    | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const phoneRaw = body.phone == null ? null : String(body.phone).trim();
  const regionRaw = body.region == null ? null : String(body.region).trim();

  if (!name) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
  if (name.length > MAX_LEN.name) {
    return NextResponse.json({ error: "Nama terlalu panjang" }, { status: 400 });
  }

  if (phoneRaw && phoneRaw.length > MAX_LEN.phone) {
    return NextResponse.json({ error: "Nomor HP terlalu panjang" }, { status: 400 });
  }
  if (regionRaw && regionRaw.length > MAX_LEN.region) {
    return NextResponse.json({ error: "Wilayah terlalu panjang" }, { status: 400 });
  }

  const updated = await prisma.partner.update({
    where: { id: partner.partnerId },
    data: {
      name,
      phone: phoneRaw && phoneRaw !== "" ? phoneRaw : null,
      region: regionRaw && regionRaw !== "" ? regionRaw : null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      region: true,
      status: true,
    },
  });

  return NextResponse.json({ partner: updated }, { status: 200 });
}
