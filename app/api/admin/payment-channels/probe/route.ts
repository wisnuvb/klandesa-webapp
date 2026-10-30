import { NextRequest, NextResponse } from "next/server";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { invalidateChannelSettings } from "@/lib/payment/channel-settings";
import { getLinkquMode, probeChannels } from "@/lib/payment/channel-probe";
import { isKnownLinkquChannelCode, listAllLinkquChannels } from "@/lib/payment/linkqu-channels";
import { toUserFacingError } from "@/lib/billing/user-error";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Uji kanal ke LinkQu. Body: { codes?: string[] (default semua), confirmProduction?: boolean }.
 * Kanal yang DITOLAK LinkQu otomatis dinonaktifkan; kanal yang diterima tidak diaktifkan otomatis (admin mungkin
 * sengaja mematikannya); gangguan jaringan tidak mengubah apa pun.
 */
export async function POST(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  try {
    const body = (await req.json().catch(() => null)) as { codes?: unknown; confirmProduction?: unknown } | null;
    const { mode } = getLinkquMode();
    if (mode === "unconfigured") {
      return NextResponse.json({ error: "LINKQU_URL belum diisi di server." }, { status: 400 });
    }
    if (mode === "production" && body?.confirmProduction !== true) {
      return NextResponse.json(
        {
          error:
            "Server ini terhubung ke LinkQu PRODUKSI. Uji kanal membuat tagihan uji sungguhan (tidak dibayar, kedaluwarsa sendiri). Konfirmasi dulu.",
          needsConfirmation: true,
        },
        { status: 409 },
      );
    }

    const all = listAllLinkquChannels().map((c) => c.code);
    const codes = Array.isArray(body?.codes)
      ? [...new Set(body.codes.filter((c): c is string => typeof c === "string" && isKnownLinkquChannelCode(c)))]
      : all;
    if (codes.length === 0) return NextResponse.json({ error: "Tidak ada kanal yang valid untuk diuji" }, { status: 400 });

    const results = await probeChannels(codes);
    const actor = auth.admin.name || auth.admin.email;
    const now = new Date();
    const disabled: string[] = [];

    for (const r of results) {
      const probe = { lastProbeOk: r.kind === "ok" ? true : r.kind === "rejected" ? false : null, lastProbeAt: now, lastProbeMessage: r.message.slice(0, 250) };
      const existing = await prisma.paymentChannelSetting.findUnique({ where: { code: r.code } });
      const shouldDisable = r.kind === "rejected" && (existing?.enabled ?? true);
      if (shouldDisable) disabled.push(r.code);
      await prisma.paymentChannelSetting.upsert({
        where: { code: r.code },
        create: {
          code: r.code,
          ...probe,
          ...(shouldDisable
            ? { enabled: false, note: `Ditolak LinkQu saat uji: ${r.message}`.slice(0, 250), updatedByName: `Uji kanal (${actor})`, updatedByUserId: auth.admin.platformUserId }
            : {}),
        },
        update: {
          ...probe,
          ...(shouldDisable
            ? { enabled: false, note: `Ditolak LinkQu saat uji: ${r.message}`.slice(0, 250), updatedByName: `Uji kanal (${actor})`, updatedByUserId: auth.admin.platformUserId }
            : {}),
        },
      });
    }
    invalidateChannelSettings();
    logger.info({ by: auth.admin.email, mode, tested: codes.length, disabled }, "[LinkQu] Uji kanal pembayaran dari panel admin");

    return NextResponse.json({ ok: true, mode, results, disabled });
  } catch (error) {
    const friendly = toUserFacingError(error, "POST /api/admin/payment-channels/probe");
    return NextResponse.json({ error: friendly.message }, { status: friendly.status });
  }
}
