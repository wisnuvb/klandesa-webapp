import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { requireVillageAdminResponse } from "@/lib/access-policy";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { checkWebsiteEnginePatchLimit } from "@/lib/website-engine/engine-rate-limit";
import { discardDraft, publishDraft } from "@/lib/website-engine/customization-store";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

async function loadContext(req: NextRequest) {
  const loaded = await requireVillageApiContext(req);
  if (!loaded.ok) return { response: loaded.response } as const;
  const forbidden = requireVillageAdminResponse(loaded.ctx.session);
  if (forbidden) return { response: forbidden } as const;
  const { village } = loaded.ctx;
  if (!isVillageSubscriptionActive(village)) {
    return { response: subscriptionBlockedResponse(village) } as const;
  }
  const sub = await prisma.websiteSubscription.findUnique({
    where: { villageId: village.id },
    select: { id: true, customization: true },
  });
  if (!sub) {
    return {
      response: NextResponse.json({ error: "Website belum aktif" }, { status: 404 }),
    } as const;
  }
  return { sub } as const;
}

/** Terbitkan draf ke situs publik; versi live sebelumnya masuk riwayat. */
export async function POST(req: NextRequest) {
  try {
    const rl = checkWebsiteEnginePatchLimit(clientIp(req));
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan, coba lagi nanti." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }
    const ctx = await loadContext(req);
    if ("response" in ctx) return ctx.response;

    const result = publishDraft(ctx.sub.customization, {
      now: new Date(),
      newId: () => crypto.randomUUID(),
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });

    await prisma.websiteSubscription.update({
      where: { id: ctx.sub.id },
      data: { customization: result.next as never },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/website/engine/publish error:", e);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

/** Buang draf dan kembali ke versi yang sedang tayang. */
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await loadContext(req);
    if ("response" in ctx) return ctx.response;
    await prisma.websiteSubscription.update({
      where: { id: ctx.sub.id },
      data: { customization: discardDraft(ctx.sub.customization) as never },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/website/engine/publish error:", e);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
