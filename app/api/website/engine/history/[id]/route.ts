import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { requireVillageAdminResponse } from "@/lib/access-policy";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { restoreHistoryAsDraft } from "@/lib/website-engine/customization-store";

/** Pulihkan versi riwayat sebagai draf; desa meninjau lalu menerbitkannya sendiri. */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const forbidden = requireVillageAdminResponse(loaded.ctx.session);
    if (forbidden) return forbidden;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);

    const { id } = await context.params;
    const sub = await prisma.websiteSubscription.findUnique({
      where: { villageId: village.id },
      select: { id: true, customization: true },
    });
    if (!sub) return NextResponse.json({ error: "Website belum aktif" }, { status: 404 });

    const result = restoreHistoryAsDraft(sub.customization, id);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });

    await prisma.websiteSubscription.update({
      where: { id: sub.id },
      data: { customization: result.next as never },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/website/engine/history/[id] error:", e);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
