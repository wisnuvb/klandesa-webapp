import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

function requireVillageAdmin(session: unknown) {
  const role = (session as { user?: { role?: string } } | null)?.user?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, session } = loaded.ctx;
    const forbidden = requireVillageAdmin(session);
    if (forbidden) return forbidden;

    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);

    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isFinite(id) || id < 1) {
      return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    }

    const domain = await prisma.websiteDomain.findFirst({
      where: { id, villageId: village.id },
      select: { id: true },
    });
    if (!domain) return NextResponse.json({ error: "Domain tidak ditemukan" }, { status: 404 });

    const events = await prisma.websiteDomainEvent.findMany({
      where: { domainId: domain.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      events: events.map((e) => ({
        id: String(e.id),
        kind: e.kind,
        message: e.message,
        meta: e.meta,
        created_at: e.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("GET /api/website/domains/[id]/events error:", e);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}

