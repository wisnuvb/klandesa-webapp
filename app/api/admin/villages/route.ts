import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accrueClosingCommissionInTx } from "@/lib/partner/commission";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { suggestReferralAcquisitionSource } from "@/lib/partner/referral-acquisition-source";
import { actorOf, auditBefore, clip } from "@/lib/platform/legacy-audit";
import { readRisky } from "@/lib/platform/legacy-risky";

/** Dilempar di dalam transaksi bila tautan mitra desa berubah oleh permintaan lain (balapan). */
class LinkConflict extends Error {}

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

  // Tautan mitra -> desa memicu komisi closing (uang terutang): wajib konfirmasi sandi admin + alasan.
  const risky = await readRisky(req, auth.admin);
  if (!risky.ok) return risky.response;
  const body = risky.body as {
    villageId?: unknown;
    villageCode?: unknown;
    partnerId?: unknown;
    acquisitionSource?: unknown;
  };

  const villageId =
    body.villageId == null || body.villageId === ""
      ? null
      : Number(body.villageId);
  const villageCodeRaw = typeof body.villageCode === "string" ? body.villageCode : "";
  const villageCode = villageCodeRaw.trim();

  if (villageId != null && (!Number.isInteger(villageId) || villageId < 1 || villageId > 2_147_483_647)) {
    return NextResponse.json({ error: "villageId tidak valid" }, { status: 400 });
  }
  if (villageId == null && (!villageCode || villageCode.length > 50)) {
    return NextResponse.json(
      { error: "Wajib isi villageId atau villageCode" },
      { status: 400 },
    );
  }

  const partnerId =
    body.partnerId == null || body.partnerId === ""
      ? null
      : Number(body.partnerId);
  if (partnerId != null && (!Number.isInteger(partnerId) || partnerId < 1 || partnerId > 2_147_483_647)) {
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
  let partnerName: string | null = null;

  if (partnerId != null) {
    const partner = await prisma.partner.findUnique({
      where: { id: Math.floor(partnerId) },
      select: { id: true, name: true },
    });
    if (!partner) {
      return NextResponse.json({ error: "Mitra tidak ditemukan" }, { status: 404 });
    }
    partnerName = partner.name;
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

  const isNewAssignment = resolvedPartnerId != null && previousPartnerId == null;

  // Menautkan desa ke mitra memicu komisi closing (uang terutang): jejak ketat SEBELUM efek.
  const blocked = await auditBefore(req, actorOf(auth), {
    action: resolvedPartnerId == null ? "village.unlink_partner" : "village.link_partner",
    targetType: "village",
    targetId: village.id,
    villageId: village.id,
    summary:
      resolvedPartnerId == null
        ? `Melepas tautan mitra dari desa "${clip(village.name, 100)}" (${village.code})`
        : `Menautkan desa "${clip(village.name, 100)}" (${village.code}) ke mitra "${clip(partnerName ?? "?", 100)}" (#${resolvedPartnerId})${isNewAssignment ? "; komisi closing akan dicatat" : ""}`,
    metadata: {
      reason: risky.reason,
      before: { partnerId: previousPartnerId },
      after: { partnerId: resolvedPartnerId, acquisitionSource: resolvedPartnerId == null ? null : mergedAcquisitionSource.slice(0, 50) },
      closingCommissionExpected: isNewAssignment,
    },
  });
  if (blocked) return blocked;

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
    // Perubahan bersyarat atas nilai sebelumnya: dua permintaan bersamaan tidak bisa sama-sama dianggap "tautan baru"
    // (tanpa ini komisi closing bisa tercatat dua kali).
    const moved = await tx.village.updateMany({
      where: { id: village.id, acquiredByPartnerId: previousPartnerId },
      data:
        resolvedPartnerId == null
          ? { acquiredByPartnerId: null, acquiredAt: null, acquisitionSource: null }
          : {
              acquiredByPartnerId: resolvedPartnerId,
              acquiredAt: new Date(),
              acquisitionSource: mergedAcquisitionSource.slice(0, 50),
            },
    });
    if (moved.count !== 1) throw new LinkConflict();
    const row = await tx.village.findUniqueOrThrow({
      where: { id: village.id },
      select: {
        id: true,
        code: true,
        name: true,
        acquiredByPartnerId: true,
        acquiredAt: true,
        acquisitionSource: true,
      },
    });

    if (isNewAssignment) {
      // Satu komisi closing per (mitra, desa): menautkan ulang desa yang sama (lepas lalu tautkan lagi) tidak menggandakannya.
      const already = await tx.partnerCommissionEntry.findFirst({
        where: { partnerId: resolvedPartnerId, villageId: row.id, type: "CLOSING", status: { not: "cancelled" } },
        select: { id: true },
      });
      if (!already) {
        await accrueClosingCommissionInTx(tx, {
          partnerId: resolvedPartnerId,
          villageId: row.id,
        });
      }
    }

    return row;
    });
  } catch (e) {
    if (e instanceof LinkConflict) {
      return NextResponse.json({ error: "Tautan mitra desa baru saja diubah; muat ulang lalu coba lagi." }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true, village: updated }, { status: 200 });
}
