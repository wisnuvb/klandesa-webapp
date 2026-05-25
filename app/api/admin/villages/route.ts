import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accrueClosingCommissionInTx } from "@/lib/partner/commission";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { suggestReferralAcquisitionSource } from "@/lib/partner/referral-acquisition-source";

function readLimit(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("limit");
  const n = raw ? Number(raw) : 50;
  if (!Number.isFinite(n)) return 50;
  return Math.max(1, Math.min(100, Math.floor(n)));
}

export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const query = (req.nextUrl.searchParams.get("query") || "").trim();
  const limit = readLimit(req);

  const where =
    query.length === 0
      ? {}
      : {
          OR: [
            { name: { contains: query } },
            { code: { contains: query } },
            { district: { contains: query } },
            { regency: { contains: query } },
            { province: { contains: query } },
          ],
        };

  const villages = await prisma.village.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      code: true,
      name: true,
      district: true,
      regency: true,
      province: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      subscriptionExpiry: true,
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ villages }, { status: 200 });
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as
    | {
        villageId?: unknown;
        villageCode?: unknown;
        partnerId?: unknown;
        acquisitionSource?: unknown;
      }
    | null;

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const villageId =
    body.villageId == null || body.villageId === ""
      ? null
      : Number(body.villageId);
  const villageCodeRaw = typeof body.villageCode === "string" ? body.villageCode : "";
  const villageCode = villageCodeRaw.trim();

  if (villageId != null && !Number.isFinite(villageId)) {
    return NextResponse.json({ error: "villageId tidak valid" }, { status: 400 });
  }
  if (villageId == null && !villageCode) {
    return NextResponse.json(
      { error: "Wajib isi villageId atau villageCode" },
      { status: 400 },
    );
  }

  const partnerId =
    body.partnerId == null || body.partnerId === ""
      ? null
      : Number(body.partnerId);
  if (partnerId != null && !Number.isFinite(partnerId)) {
    return NextResponse.json({ error: "partnerId tidak valid" }, { status: 400 });
  }

  const source =
    typeof body.acquisitionSource === "string"
      ? body.acquisitionSource.trim().slice(0, 50)
      : "";
  const acquisitionSource = source || "admin";

  const village = await prisma.village.findUnique({
    where: villageId != null ? { id: Math.floor(villageId) } : { code: villageCode },
    select: {
      id: true,
      code: true,
      name: true,
      email: true,
      acquiredByPartnerId: true,
    },
  });
  if (!village) {
    return NextResponse.json({ error: "Desa tidak ditemukan" }, { status: 404 });
  }

  const previousPartnerId = village.acquiredByPartnerId;

  if (partnerId != null) {
    const partner = await prisma.partner.findUnique({
      where: { id: Math.floor(partnerId) },
      select: { id: true },
    });
    if (!partner) {
      return NextResponse.json({ error: "Mitra tidak ditemukan" }, { status: 404 });
    }
  }

  const resolvedPartnerId =
    partnerId == null ? null : Math.floor(partnerId);

  let mergedAcquisitionSource = acquisitionSource;
  if (resolvedPartnerId != null) {
    const suggested = await suggestReferralAcquisitionSource(
      resolvedPartnerId,
      {
        name: village.name,
        email: village.email ?? null,
      },
    );
    if (suggested != null) {
      mergedAcquisitionSource = suggested;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.village.update({
      where: { id: village.id },
      data:
        resolvedPartnerId == null
          ? { acquiredByPartnerId: null, acquiredAt: null, acquisitionSource: null }
          : {
              acquiredByPartnerId: resolvedPartnerId,
              acquiredAt: new Date(),
              acquisitionSource: mergedAcquisitionSource.slice(0, 50),
            },
      select: {
        id: true,
        code: true,
        name: true,
        acquiredByPartnerId: true,
        acquiredAt: true,
        acquisitionSource: true,
      },
    });

    const isNewAssignment =
      resolvedPartnerId != null && previousPartnerId == null;
    if (isNewAssignment) {
      await accrueClosingCommissionInTx(tx, {
        partnerId: resolvedPartnerId,
        villageId: row.id,
      });
    }

    return row;
  });

  return NextResponse.json({ ok: true, village: updated }, { status: 200 });
}
