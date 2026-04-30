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

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const beneficiaryId = Number((await ctx.params).id);
    if (!Number.isFinite(beneficiaryId))
      return NextResponse.json({ error: "Entri tidak ada" }, { status: 400 });

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const row = await prisma.socialBenefitBeneficiary.findUnique({
      where: { id: beneficiaryId },
      include: { program: true },
    });

    if (!row || row.program.villageId !== village.id) {
      return NextResponse.json({ error: "Entri tidak ada" }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    const data: {
      nik?: string;
      status?: SocialBenefitEnrollmentStatus;
      publicNote?: string | null;
    } = {};

    if (body && body.nik !== undefined) {
      const nik = normalizeNik(body.nik);
      if (!isValidNik(nik)) {
        return NextResponse.json(
          { error: "NIK harus 16 digit numerik" },
          { status: 400 },
        );
      }
      data.nik = nik;
    }
    if (body && body.status !== undefined) {
      const statusRaw = String(body.status ?? "");
      if (!STATUS_SET.has(statusRaw)) {
        return NextResponse.json(
          { error: "Nilai status tidak dikenal" },
          { status: 400 },
        );
      }
      data.status = statusRaw as SocialBenefitEnrollmentStatus;
    }
    if (body && body.publicNote !== undefined) {
      data.publicNote = body.publicNote
        ? String(body.publicNote).trim().slice(0, 240)
        : null;
    }

    const updated = await prisma.socialBenefitBeneficiary.update({
      where: { id: beneficiaryId },
      data,
    });

    return NextResponse.json({
      ok: true,
      beneficiary: {
        id: updated.id,
        nikMasked: `${updated.nik.slice(0, 6)}****${updated.nik.slice(14)}`,
        status: updated.status,
        publicNote: updated.publicNote,
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
        { error: "NIK tersebut sudah terdaftar lain pada program yang sama." },
        { status: 409 },
      );
    }
    console.error("PATCH social-benefits/beneficiaries/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const beneficiaryId = Number((await ctx.params).id);
    if (!Number.isFinite(beneficiaryId))
      return NextResponse.json({ error: "Entri tidak ada" }, { status: 400 });

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const row = await prisma.socialBenefitBeneficiary.findUnique({
      where: { id: beneficiaryId },
      include: { program: true },
    });

    if (!row || row.program.villageId !== village.id) {
      return NextResponse.json({ error: "Entri tidak ada" }, { status: 404 });
    }

    await prisma.socialBenefitBeneficiary.delete({ where: { id: beneficiaryId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE social-benefits/beneficiaries/[id]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
