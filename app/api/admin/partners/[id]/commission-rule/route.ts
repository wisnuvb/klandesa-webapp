import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import {
  DEFAULT_PARTNER_CLOSING_BONUS_IDR,
  DEFAULT_PARTNER_CLOSING_BONUS_PERCENT,
  DEFAULT_PARTNER_SUBSCRIPTION_SHARE_PERCENT,
} from "@/lib/partner/defaults";
import { toJSONSafe } from "@/utils/json";
import { readRisky } from "@/lib/platform/legacy-risky";
import { actorOf, auditBefore, parsePositiveInt, toNumber } from "@/lib/platform/legacy-audit";

/** Batas wajar nominal tetap bonus closing (kolom DB Decimal(15,2) jauh lebih longgar). */
const MAX_CLOSING_BONUS_IDR = 1_000_000_000;

const partnerIdFromParam = (raw: string): number | null => parsePositiveInt(raw);

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

  // upsert (bukan findUnique+create): dua permintaan bersamaan tidak lagi berbenturan pada kolom unik partnerId.
  const rule = await prisma.partnerCommissionRule.upsert({
    where: { partnerId: pid },
    update: {},
    create: {
      partnerId: pid,
      closingBonusAmount: DEFAULT_PARTNER_CLOSING_BONUS_IDR,
      closingBonusPercent: DEFAULT_PARTNER_CLOSING_BONUS_PERCENT,
      subscriptionSharePercent: DEFAULT_PARTNER_SUBSCRIPTION_SHARE_PERCENT,
    },
  });

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

  // Skema bagi hasil menentukan uang yang terutang ke mitra: wajib konfirmasi sandi admin + alasan.
  const risky = await readRisky(req, auth.admin);
  if (!risky.ok) return risky.response;
  const body = risky.body as {
    closingBonusAmount?: unknown;
    /** Angka 0–100, atau null untuk kembali ke nominal tetap. Tidak dikirim = tidak diubah. */
    closingBonusPercent?: unknown;
    subscriptionSharePercent?: unknown;
    isActive?: unknown;
  };

  const partner = await prisma.partner.findUnique({ where: { id: pid }, select: { id: true, name: true } });
  if (!partner) return NextResponse.json({ error: "Mitra tidak ditemukan" }, { status: 404 });

  const closingBonusAmount =
    body.closingBonusAmount == null ? undefined : toNumber(body.closingBonusAmount);
  const closingBonusPercent =
    body.closingBonusPercent === undefined
      ? undefined
      : body.closingBonusPercent === null || body.closingBonusPercent === ""
        ? null
        : toNumber(body.closingBonusPercent);
  const subscriptionSharePercent =
    body.subscriptionSharePercent == null
      ? undefined
      : toNumber(body.subscriptionSharePercent);
  // Hanya boolean sungguhan: Boolean("false") === true akan diam-diam mengaktifkan skema.
  if (body.isActive != null && typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "isActive harus true/false" }, { status: 400 });
  }
  const isActive = body.isActive == null ? undefined : body.isActive;

  if (
    closingBonusAmount !== undefined &&
    (!Number.isFinite(closingBonusAmount) || closingBonusAmount < 0 || closingBonusAmount > MAX_CLOSING_BONUS_IDR)
  ) {
    return NextResponse.json({ error: "closingBonusAmount tidak valid" }, { status: 400 });
  }
  if (
    closingBonusPercent != null &&
    (!Number.isFinite(closingBonusPercent) || closingBonusPercent < 0 || closingBonusPercent > 100)
  ) {
    return NextResponse.json({ error: "closingBonusPercent harus 0–100" }, { status: 400 });
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

  // Skema bagi hasil menentukan uang yang akan terutang ke mitra: jejak ditulis (ketat) SEBELUM perubahan.
  const before = await prisma.partnerCommissionRule.findUnique({ where: { partnerId: pid } });
  const snap = (r: { closingBonusAmount: unknown; closingBonusPercent: unknown; subscriptionSharePercent: unknown; isActive: boolean } | null) =>
    r
      ? {
          closingBonusAmount: Number(r.closingBonusAmount),
          closingBonusPercent: r.closingBonusPercent == null ? null : Number(r.closingBonusPercent),
          subscriptionSharePercent: Number(r.subscriptionSharePercent),
          isActive: r.isActive,
        }
      : null;
  const prev = snap(before) ?? {
    closingBonusAmount: DEFAULT_PARTNER_CLOSING_BONUS_IDR,
    closingBonusPercent: DEFAULT_PARTNER_CLOSING_BONUS_PERCENT == null ? null : Number(DEFAULT_PARTNER_CLOSING_BONUS_PERCENT),
    subscriptionSharePercent: DEFAULT_PARTNER_SUBSCRIPTION_SHARE_PERCENT,
    isActive: true,
  };
  const next = {
    closingBonusAmount: closingBonusAmount ?? prev.closingBonusAmount,
    closingBonusPercent: closingBonusPercent === undefined ? prev.closingBonusPercent : closingBonusPercent,
    subscriptionSharePercent: subscriptionSharePercent ?? prev.subscriptionSharePercent,
    isActive: isActive ?? prev.isActive,
  };
  const blocked = await auditBefore(req, actorOf(auth), {
    action: "partner.commission_rule_update",
    targetType: "partner",
    targetId: pid,
    summary: `Mengubah skema bagi hasil mitra "${partner.name}" (#${pid})`,
    metadata: { reason: risky.reason, before: prev, after: next, ruleExistedBefore: Boolean(before) },
  });
  if (blocked) return blocked;

  await prisma.partnerCommissionRule.upsert({
    where: { partnerId: pid },
    create: {
      partnerId: pid,
      closingBonusAmount: closingBonusAmount ?? DEFAULT_PARTNER_CLOSING_BONUS_IDR,
      closingBonusPercent:
        closingBonusPercent === undefined ? DEFAULT_PARTNER_CLOSING_BONUS_PERCENT : closingBonusPercent,
      subscriptionSharePercent:
        subscriptionSharePercent ?? DEFAULT_PARTNER_SUBSCRIPTION_SHARE_PERCENT,
      isActive: isActive ?? true,
    },
    update: {
      ...(closingBonusAmount !== undefined ? { closingBonusAmount } : {}),
      ...(closingBonusPercent !== undefined ? { closingBonusPercent } : {}),
      ...(subscriptionSharePercent !== undefined ? { subscriptionSharePercent } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });

  const rule = await prisma.partnerCommissionRule.findUniqueOrThrow({
    where: { partnerId: pid },
  });

  return NextResponse.json(toJSONSafe({ ok: true, rule }), { status: 200 });
}
