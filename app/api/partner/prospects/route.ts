import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiSession } from "@/lib/api-session";
import { getPartnerSession } from "@/lib/partner-session";
import { toJSONSafe } from "@/utils/json";

const MAX_LEN = {
  villageName: 255,
  location: 255,
  picName: 255,
  picPhone: 40,
  notes: 2000,
} as const;

function readLimit(req: NextRequest, fallback: number): number {
  const raw = req.nextUrl.searchParams.get("limit");
  const n = raw ? Number(raw) : fallback;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(50, Math.floor(n)));
}

export async function GET(req: NextRequest) {
  const session = await getApiSession(req);
  const partner = getPartnerSession(session);
  if (!partner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = readLimit(req, 30);
  const rows = await prisma.partnerProspect.findMany({
    where: { partnerId: partner.partnerId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      villageName: true,
      district: true,
      regency: true,
      province: true,
      picName: true,
      picPhone: true,
      status: true,
      notes: true,
      lastContactAt: true,
      nextFollowUpAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ prospects: toJSONSafe(rows) }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const session = await getApiSession(req);
  const partner = getPartnerSession(session);
  if (!partner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | {
        villageName?: unknown;
        district?: unknown;
        regency?: unknown;
        province?: unknown;
        picName?: unknown;
        picPhone?: unknown;
        notes?: unknown;
      }
    | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const villageName = String(body.villageName ?? "").trim();
  const district = body.district == null ? null : String(body.district).trim();
  const regency = body.regency == null ? null : String(body.regency).trim();
  const province = body.province == null ? null : String(body.province).trim();
  const picName = body.picName == null ? null : String(body.picName).trim();
  const picPhone = body.picPhone == null ? null : String(body.picPhone).trim();
  const notes = body.notes == null ? null : String(body.notes).trim();

  if (!villageName) {
    return NextResponse.json({ error: "Nama desa wajib diisi" }, { status: 400 });
  }
  if (villageName.length > MAX_LEN.villageName) {
    return NextResponse.json({ error: "Nama desa terlalu panjang" }, { status: 400 });
  }

  for (const [label, v, max] of [
    ["Kecamatan", district, MAX_LEN.location],
    ["Kabupaten", regency, MAX_LEN.location],
    ["Provinsi", province, MAX_LEN.location],
    ["Nama PIC", picName, MAX_LEN.picName],
    ["HP PIC", picPhone, MAX_LEN.picPhone],
  ] as const) {
    if (v && v.length > max) {
      return NextResponse.json({ error: `${label} terlalu panjang` }, { status: 400 });
    }
  }
  if (notes && notes.length > MAX_LEN.notes) {
    return NextResponse.json({ error: "Catatan terlalu panjang" }, { status: 400 });
  }

  const created = await prisma.partnerProspect.create({
    data: {
      partnerId: partner.partnerId,
      villageName,
      district: district && district !== "" ? district : null,
      regency: regency && regency !== "" ? regency : null,
      province: province && province !== "" ? province : null,
      picName: picName && picName !== "" ? picName : null,
      picPhone: picPhone && picPhone !== "" ? picPhone : null,
      notes: notes && notes !== "" ? notes : null,
      status: "BARU",
      events: {
        create: {
          fromStatus: null,
          toStatus: "BARU",
          note: "Dibuat",
        },
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}
