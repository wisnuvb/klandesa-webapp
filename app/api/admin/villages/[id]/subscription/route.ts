import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/prisma";
import { requireStepUp } from "@/lib/platform/step-up";
import { auditPlatform, auditPlatformStrict } from "@/lib/platform/audit";
import { arsipStorageLimitForDesaTierGb } from "@/lib/billing/catalog";
import { getSubscriptionPhaseInfo } from "@/lib/subscription";
import {
  computeExtend,
  nextStorageLimitGb,
  validateExtend,
  validateReason,
  validateSet,
} from "@/lib/platform/villages/subscription";
import { clearVillageHealthCache } from "@/lib/platform/villages/queries";
import { badId, notFound, parseVillageId, type VillageRouteCtx } from "@/lib/platform/villages/route-helpers";

export const dynamic = "force-dynamic";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

const snap = (v: { subscriptionPlan: string; subscriptionStatus: string; subscriptionExpiry: Date | null; storageLimit: number }) => ({
  plan: v.subscriptionPlan,
  status: v.subscriptionStatus,
  expiry: v.subscriptionExpiry?.toISOString() ?? null,
  storageLimitGb: v.storageLimit,
});

/**
 * Mutasi langganan desa oleh super admin. Body: { action: "extend", amount, unit } atau
 * { action: "set", plan, status, expiry }, plus { reason, confirmPassword }.
 *
 * Tidak membuat tagihan dan TIDAK memanggil fungsi komisi mitra: perpanjangan manual tidak menghasilkan komisi.
 */
export async function POST(req: NextRequest, ctx: VillageRouteCtx) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const id = parseVillageId((await ctx.params).id);
  if (id == null) return badId();

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || Array.isArray(body)) return bad("Body tidak valid");

  const step = await requireStepUp(auth.admin.platformUserId, body.confirmPassword, { totpCode: body.totpCode, req });
  if (!step.ok) return step.response;

  const reason = validateReason(body.reason);
  if (!reason.ok) return bad(reason.error);

  const action = body.action;
  if (action !== "extend" && action !== "set") return bad("Aksi harus 'extend' atau 'set'.");

  const extendIn = action === "extend" ? validateExtend(body) : null;
  if (extendIn && !extendIn.ok) return bad(extendIn.error);
  const setIn = action === "set" ? validateSet(body) : null;
  if (setIn && !setIn.ok) return bad(setIn.error);

  const village = await prisma.village.findUnique({
    where: { id },
    select: { id: true, code: true, name: true, subscriptionPlan: true, subscriptionStatus: true, subscriptionDate: true, subscriptionExpiry: true, storageLimit: true },
  });
  if (!village) return notFound();

  const before = snap(village);
  const now = new Date();
  let data: { subscriptionPlan?: string; subscriptionStatus: string; subscriptionExpiry: Date | null; subscriptionDate?: Date; storageLimit?: number };

  if (extendIn && extendIn.ok) {
    const r = computeExtend(
      { plan: village.subscriptionPlan, status: village.subscriptionStatus, expiry: village.subscriptionExpiry, startedAt: village.subscriptionDate },
      extendIn.value,
      now,
    );
    if (!r.ok) return bad(r.error, 409);
    data = { subscriptionStatus: r.value.status, subscriptionExpiry: r.value.expiry, subscriptionDate: r.value.startedAt };
  } else if (setIn && setIn.ok) {
    const v = setIn.value;
    data = {
      subscriptionPlan: v.plan,
      subscriptionStatus: v.status,
      subscriptionExpiry: v.expiry,
      ...(village.subscriptionDate ? {} : { subscriptionDate: now }),
      ...(v.plan !== village.subscriptionPlan
        ? { storageLimit: nextStorageLimitGb(village.storageLimit, arsipStorageLimitForDesaTierGb(v.plan)) }
        : {}),
    };
  } else {
    return bad("Aksi tidak valid");
  }

  const intended = snap({
    subscriptionPlan: data.subscriptionPlan ?? village.subscriptionPlan,
    subscriptionStatus: data.subscriptionStatus,
    subscriptionExpiry: data.subscriptionExpiry,
    storageLimit: data.storageLimit ?? village.storageLimit,
  });
  const actor = { platformUserId: auth.admin.platformUserId, email: auth.admin.email };
  const entry = {
    action: action === "extend" ? "village.subscription_extend" : "village.subscription_set",
    targetType: "village" as const,
    targetId: id,
    villageId: id,
  };
  // Jejak KETAT ditulis SEBELUM efek: bila gagal tertulis, perubahan langganan tidak dijalankan.
  try {
    await auditPlatformStrict(req, actor, {
      ...entry,
      summary:
        action === "extend"
          ? `Perpanjang langganan ${village.name} (${village.code}) ${extendIn && extendIn.ok ? `${extendIn.value.amount} ${extendIn.value.unit === "days" ? "hari" : "bulan"}` : ""}. Alasan: ${reason.value}`
          : `Ubah langganan ${village.name} (${village.code}). Alasan: ${reason.value}`,
      metadata: {
        reason: reason.value,
        before,
        after: intended,
        ...(extendIn && extendIn.ok ? { amount: extendIn.value.amount, unit: extendIn.value.unit } : {}),
      },
    });
  } catch (e) {
    console.error("[admin/villages] jejak langganan gagal:", e instanceof Error ? e.message : e);
    return bad("Jejak audit gagal ditulis; langganan tidak diubah.", 500);
  }

  // Penulisan bersyarat pada nilai yang baru dibaca: dua admin yang bekerja bersamaan tidak saling menimpa diam-diam.
  const res = await prisma.village.updateMany({
    where: {
      id,
      subscriptionPlan: village.subscriptionPlan,
      subscriptionStatus: village.subscriptionStatus,
      subscriptionExpiry: village.subscriptionExpiry,
    },
    data,
  });
  if (res.count === 0) {
    await auditPlatform(req, actor, { ...entry, summary: `Dibatalkan: langganan ${village.name} (${village.code}) berubah bersamaan; perubahan tidak diterapkan.`, metadata: { reason: reason.value, aborted: true } });
    return bad("Langganan baru saja berubah. Muat ulang halaman lalu coba lagi.", 409);
  }

  const after = await prisma.village.findUniqueOrThrow({
    where: { id },
    select: { subscriptionPlan: true, subscriptionStatus: true, subscriptionExpiry: true, storageLimit: true },
  });
  clearVillageHealthCache(id);

  const info = getSubscriptionPhaseInfo({ subscriptionStatus: after.subscriptionStatus, subscriptionExpiry: after.subscriptionExpiry });
  return NextResponse.json({
    ok: true,
    before,
    after: snap(after),
    phase: info.phase,
    daysRemaining: info.daysRemaining,
  });
}
