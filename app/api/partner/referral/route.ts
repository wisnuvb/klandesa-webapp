import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getPartnerSession } from "@/lib/partner-session";
import { buildPartnerShareUrl } from "@/lib/partner/public-page";
import { toJSONSafe } from "@/utils/json";

const RECENT_LIMIT = 40;

export async function GET(req: Request) {
  const session = await auth();
  const partner = getPartnerSession(session);
  if (!partner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const partnerRow = await prisma.partner.findUnique({
    where: { id: partner.partnerId },
    select: {
      publicSlug: true,
      publicPageEnabled: true,
      status: true,
    },
  });

  const row = await prisma.referralCode.findUnique({
    where: { partnerId: partner.partnerId },
    select: {
      id: true,
      code: true,
      label: true,
      ownerName: true,
      ownerEmail: true,
      commission: true,
      status: true,
      landingPath: true,
      createdAt: true,
      _count: { select: { events: true } },
    },
  });

  if (!row) {
    const empty = {
      referralCode: null,
      summary: {
        totalEvents: 0,
        registerSubmit: 0,
        contactSubmit: 0,
        whatsappClick: 0,
        pageView: 0,
      },
      actionSummary: {} as Record<string, number>,
      recentEvents: [] as unknown[],
    };
    return NextResponse.json(toJSONSafe(empty));
  }

  const actionGroups = await prisma.referralEvent.groupBy({
    by: ["action"],
    where: { referralCodeId: row.id },
    _count: { _all: true },
  });

  const actionSummary: Record<string, number> = {};
  for (const g of actionGroups) {
    actionSummary[g.action] = g._count._all;
  }

  const recentRaw = await prisma.referralEvent.findMany({
    where: { referralCodeId: row.id },
    orderBy: { createdAt: "desc" },
    take: RECENT_LIMIT,
    select: {
      id: true,
      codeSnapshot: true,
      action: true,
      sourcePath: true,
      name: true,
      email: true,
      phone: true,
      villageName: true,
      subject: true,
      createdAt: true,
    },
  });

  const totalEvents = row._count.events;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const origin = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:2042";
  const shareUrl =
    partnerRow?.publicPageEnabled &&
    partnerRow.status === "active" &&
    row.status === "active"
      ? buildPartnerShareUrl(origin, partnerRow.publicSlug, row.code)
      : null;

  const payload = {
    referralCode: {
      ...row,
      createdAt: row.createdAt.toISOString(),
      eventCount: totalEvents,
      publicSlug: partnerRow?.publicSlug ?? null,
      shareUrl,
    },
    summary: {
      totalEvents,
      registerSubmit: actionSummary.register_submit ?? 0,
      contactSubmit: actionSummary.contact_submit ?? 0,
      whatsappClick: actionSummary.whatsapp_click ?? 0,
      pageView: actionSummary.page_view ?? 0,
    },
    actionSummary,
    recentEvents: recentRaw.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
  };

  return NextResponse.json(toJSONSafe(payload));
}
