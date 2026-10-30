import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { invalidateChannelSettings } from "@/lib/payment/channel-settings";
import { channelUnavailableReason } from "@/lib/payment/channel-health";
import { getLinkquMode } from "@/lib/payment/channel-probe";
import {
  envDisabledChannelCodes,
  evaluateLinkquChannel,
  isKnownLinkquChannelCode,
  listAllLinkquChannels,
} from "@/lib/payment/linkqu-channels";

export const dynamic = "force-dynamic";

/** Daftar semua kanal pembayaran beserta status yang diatur admin, kunci env, dan jejak penolakan/uji LinkQu. */
export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const rows = await prisma.paymentChannelSetting.findMany();
  const byCode = new Map(rows.map((r) => [r.code, r]));
  const envLocked = envDisabledChannelCodes();
  const adminDisabled = new Set(rows.filter((r) => !r.enabled).map((r) => r.code));
  const now = Date.now();

  const channels = listAllLinkquChannels().map((c) => {
    const row = byCode.get(c.code);
    const effective = evaluateLinkquChannel(c.code, c.group, undefined, now, adminDisabled);
    return {
      code: c.code,
      label: c.label,
      method: c.method,
      enabled: row ? row.enabled : true,
      note: row?.note ?? null,
      envLocked: envLocked.has(c.code),
      /** Penanda sementara dari deteksi otomatis di proses ini (~10 menit). */
      runtimeReason: channelUnavailableReason(c.code, now),
      available: effective.available,
      lastError: row?.lastError ?? null,
      lastErrorAt: row?.lastErrorAt?.toISOString() ?? null,
      lastProbe:
        row?.lastProbeAt != null
          ? { ok: row.lastProbeOk, at: row.lastProbeAt.toISOString(), message: row.lastProbeMessage }
          : null,
      updatedAt: row?.updatedAt.toISOString() ?? null,
      updatedByName: row?.updatedByName ?? null,
    };
  });

  return NextResponse.json({ ...getLinkquMode(), channels }, { headers: { "Cache-Control": "no-store" } });
}

/** Aktifkan / nonaktifkan satu kanal untuk semua desa. Body: { code, enabled, note? } */
export async function PATCH(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as { code?: unknown; enabled?: unknown; note?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code : "";
  if (!isKnownLinkquChannelCode(code)) {
    return NextResponse.json({ error: "Kode kanal tidak dikenal" }, { status: 400 });
  }
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "Field enabled wajib berupa true/false" }, { status: 400 });
  }
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 250) : null;

  const data = {
    enabled: body.enabled,
    // Catatan hanya relevan saat dimatikan; saat diaktifkan kembali dikosongkan.
    note: body.enabled ? null : note,
    updatedByUserId: auth.admin.platformUserId,
    updatedByName: auth.admin.name || auth.admin.email,
  };
  const row = await prisma.paymentChannelSetting.upsert({
    where: { code },
    create: { code, ...data },
    update: data,
  });
  invalidateChannelSettings();
  logger.info(
    { code, enabled: row.enabled, note: row.note, by: auth.admin.email },
    "[LinkQu] Status kanal pembayaran diubah admin",
  );

  return NextResponse.json({ ok: true, code, enabled: row.enabled, note: row.note });
}
