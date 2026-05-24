import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import {
  DEFAULT_PARTNER_CLOSING_BONUS_IDR,
  DEFAULT_PARTNER_SUBSCRIPTION_SHARE_PERCENT,
} from "@/lib/partner/defaults";
import { toJSONSafe } from "@/utils/json";

function partnerIdFromParam(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformSession(_req);
  if (!auth.ok) return auth.response;

  const pid = partnerIdFromParam((await ctx.params).id ?? "");
  if (pid == null) {
    return NextResponse.json({ error: "ID mitra tidak valid" }, { status: 400 });
  }

  const partner = await prisma.partner.findUnique({ where: { id: pid }, select: { id: true } });
  if (!partner) return NextResponse.json({ error: "Mitra tidak ditemukan" }, { status: 404 });

  const rule =
    (await prisma.partnerCommissionRule.findUnique({ where: { partnerId: pid } })) ??
    (await prisma.partnerCommissionRule.create({
      data: {
        partnerId: pid,
        closingBonusAmount: DEFAULT_PARTNER_CLOSING_BONUS_IDR,
        subscriptionSharePercent: DEFAULT_PARTNER_SUBSCRIPTION_SHARE_PERCENT,
      },
    }));

  return NextResponse.json(toJSONSafe({ rule }), { status: 200 });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const pid = partnerIdFromParam((await ctx.params).id ?? "");
  if (pid == null) {
    return NextResponse.json({ error: "ID mitra tidak valid" }, { status: 400 });
  }

  const partner = await prisma.partner.findUnique({ where: { id: pid }, select: { id: true } });
  if (!partner) return NextResponse.json({ error: "Mitra tidak ditemukan" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as {
    closingBonusAmount?: unknown;
    subscriptionSharePercent?: unknown;
    isActive?: unknown;
  } | null;

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const closingBonusAmount =
    body.closingBonusAmount == null ? undefined : Number(body.closingBonusAmount);
  const subscriptionSharePercent =
    body.subscriptionSharePercent == null
      ? undefined
      : Number(body.subscriptionSharePercent);
  const isActive = body.isActive == null ? undefined : Boolean(body.isActive);

  if (
    closingBonusAmount !== undefined &&
    (!Number.isFinite(closingBonusAmount) || closingBonusAmount < 0)
  ) {
    return NextResponse.json({ error: "closingBonusAmount tidak valid" }, { status: 400 });
  }
  if (
    subscriptionSharePercent !== undefined &&
    (!Number.isFinite(subscriptionSharePercent) ||
      subscriptionSharePercent < 0 ||
      subscriptionSharePercent > 100)
  ) {
    return NextResponse.json(
      { error: "subscriptionSharePercent harus 0–100" },
      { status: 400 },
    );
  }

  await prisma.partnerCommissionRule.upsert({
    where: { partnerId: pid },
    create: {
      partnerId: pid,
      closingBonusAmount: closingBonusAmount ?? DEFAULT_PARTNER_CLOSING_BONUS_IDR,
      subscriptionSharePercent:
        subscriptionSharePercent ?? DEFAULT_PARTNER_SUBSCRIPTION_SHARE_PERCENT,
      isActive: isActive ?? true,
    },
    update: {
      ...(closingBonusAmount !== undefined ? { closingBonusAmount } : {}),
      ...(subscriptionSharePercent !== undefined ? { subscriptionSharePercent } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  const rule = await prisma.partnerCommissionRule.findUniqueOrThrow({
    where: { partnerId: pid },
  });

  return NextResponse.json(toJSONSafe({ ok: true, rule }), { status: 200 });
}
