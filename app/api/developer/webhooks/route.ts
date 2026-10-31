import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { safeUrl } from "@/lib/webhooks/url-guard";
import { prisma } from "@/lib/prisma";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events";
import { createEndpoint, listEndpoints, MAX_ENDPOINTS_PER_VILLAGE } from "@/lib/webhooks/service";

const adminOnly = () => NextResponse.json({ error: "Hanya admin desa yang dapat mengelola webhook." }, { status: 403 });

/** Daftar tujuan webhook desa ini (tanpa rahasia) dan katalog kejadian yang bisa dilanggan. */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (ctx.dbUser.role !== "admin") return adminOnly();
    return NextResponse.json({
      maxEndpoints: MAX_ENDPOINTS_PER_VILLAGE,
      events: Object.entries(WEBHOOK_EVENTS).map(([id, e]) => ({ id, ...e })),
      endpoints: await listEndpoints(prisma, ctx.village.id),
    });
  } catch (e) {
    console.error("GET /api/developer/webhooks error:", e);
    return NextResponse.json({ error: "Gagal memuat webhook" }, { status: 500 });
  }
}

/** Tambah tujuan: { name, url, events[] }. Rahasia penandatangan hanya muncul di respons ini, sekali. */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (ctx.dbUser.role !== "admin") return adminOnly();
    const body = await req.json().catch(() => null);
    const r = await createEndpoint(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, name: body?.name, url: body?.url, events: body?.events });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    // Rahasia tidak pernah masuk jejak audit.
    await auditWeb(req, ctx, "create", "webhook_endpoints", r.data.endpoint.id, { name: r.data.endpoint.name, url: safeUrl(r.data.endpoint.url), events: r.data.endpoint.events });
    return NextResponse.json({ success: true, secret: r.data.secret, endpoint: r.data.endpoint }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("POST /api/developer/webhooks error:", e);
    return NextResponse.json({ error: "Gagal menambah webhook" }, { status: 500 });
  }
}
