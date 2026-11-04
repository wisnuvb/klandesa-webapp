import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { mergeOrgSettings, parseOrgSettingsPatch, readOrgSettings } from "@/lib/officials/org";

/** Pengaturan bagan hirarki perangkat (jalur lapor Kasi, garis koordinasi). Disimpan di Village.settings.orgChart. */
export async function PATCH(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);

    const body = await req.json().catch(() => null);
    const parsed = parseOrgSettingsPatch(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const before = readOrgSettings(village.settings);
    const settings = mergeOrgSettings(village.settings, parsed.patch);
    await prisma.village.update({ where: { id: village.id }, data: { settings: settings as Prisma.InputJsonValue } });

    const after = readOrgSettings(settings);
    await auditWeb(req, loaded.ctx, "update", "village_profile", village.id, { settingsKeysChanged: ["orgChart"], before, after, source: "data_perangkat" });

    return NextResponse.json({ orgSettings: after }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("PATCH /api/officials/org-settings error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
