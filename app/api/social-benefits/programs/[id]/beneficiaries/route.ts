import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { normalizeNik, isValidNik } from "@/lib/nik-validation";
import { SocialBenefitEnrollmentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const STATUS_SET = new Set<string>(
  Object.values(SocialBenefitEnrollmentStatus),
);

async function assertProgramOwned(
  villageId: number,
  programId: number,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const p = await prisma.socialBenefitProgram.findFirst({
    where: { id: programId, villageId },
  });
  if (!p) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Program tidak ada" }, { status: 404 }),
    };
  }
  return { ok: true };
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const programId = Number((await ctx.params).id);
    if (!Number.isFinite(programId)) {
      return NextResponse.json({ error: "Program tidak ada" }, { status: 400 });
    }

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const owned = await assertProgramOwned(village.id, programId);
    if (!owned.ok) return owned.response;

    const beneficiaries = await prisma.socialBenefitBeneficiary.findMany({
      where: { programId },
      orderBy: { id: "desc" },
      take: 2000,
      select: {
        id: true,
        nik: true,
        publicNote: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      rows: beneficiaries.map((b) => ({
        id: b.id,
        /** NIK tampilan terpotong untuk dashboard (bukan anonim sepenuhnya). */
        nikMasked: `${b.nik.slice(0, 6)}****${b.nik.slice(14)}`,
        publicNote: b.publicNote,
        status: b.status,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      })),
      fullNikAvailable: false,
    });
  } catch (e) {
    console.error("GET social-benefits/.../beneficiaries", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const programId = Number((await ctx.params).id);
    if (!Number.isFinite(programId)) {
      return NextResponse.json({ error: "Program tidak ada" }, { status: 400 });
    }

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const owned = await assertProgramOwned(village.id, programId);
    if (!owned.ok) return owned.response;

    const body = (await req.json().catch(() => null)) as {
      nik?: unknown;
      status?: unknown;
      publicNote?: unknown;
    } | null;

    const nik = normalizeNik(body?.nik ?? "");
    if (!isValidNik(nik)) {
      return NextResponse.json(
        { error: "NIK harus 16 digit numerik" },
        { status: 400 },
      );
    }

    const statusRaw = String(body?.status ?? "registered");
    const status = STATUS_SET.has(statusRaw)
      ? (statusRaw as SocialBenefitEnrollmentStatus)
      : SocialBenefitEnrollmentStatus.registered;

    const publicNote = body?.publicNote
      ? String(body.publicNote).trim().slice(0, 240)
      : null;

    const created = await prisma.socialBenefitBeneficiary.create({
      data: {
        programId,
        nik,
        status,
        publicNote: publicNote || null,
      },
    });

    return NextResponse.json({
      ok: true,
      beneficiary: {
        id: created.id,
        nikMasked: `${created.nik.slice(0, 6)}****${created.nik.slice(14)}`,
        status: created.status,
        publicNote: created.publicNote,
      },
    });
  } catch (e: unknown) {
    const code =
      typeof e === "object" &&
      e &&
      "code" in e &&
      (e as { code?: string }).code === "P2002";
    if (code) {
      return NextResponse.json(
        {
          error:
            "NIK ini sudah tercatat pada program tersebut. Gunakan hapus/perbarui dahulu.",
        },
        { status: 409 },
      );
    }
    console.error("POST social-benefits/.../beneficiaries", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
