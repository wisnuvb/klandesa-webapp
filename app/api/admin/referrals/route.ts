import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { normalizeReferralCode } from "@/lib/referrals/tracking";
import { provisionPartnerFromReferralCodeTx } from "@/lib/partner/provision";

function readLimit(req: NextRequest): number {
  const raw = req.nextUrl.searchParams.get("limit");
  const n = raw ? Number(raw) : 50;
  if (!Number.isFinite(n)) return 50;
  return Math.max(1, Math.min(100, Math.floor(n)));
}

export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const query = (req.nextUrl.searchParams.get("query") || "").trim();
  const limit = readLimit(req);
  const where =
    query.length === 0
      ? {}
      : {
          OR: [
            { code: { contains: query } },
            { label: { contains: query } },
            { ownerName: { contains: query } },
            { ownerPhone: { contains: query } },
            { ownerEmail: { contains: query } },
          ],
        };

  const rows = await prisma.referralCode.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      code: true,
      label: true,
      ownerName: true,
      ownerPhone: true,
      ownerEmail: true,
      commission: true,
      status: true,
      landingPath: true,
      notes: true,
      createdAt: true,
      partnerId: true,
      _count: { select: { events: true } },
      events: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { action: true, createdAt: true, phone: true, email: true },
      },
    },
  });

  const codeIds = rows.map((r) => r.id);
  const actionGroups =
    codeIds.length === 0
      ? []
      : await prisma.referralEvent.groupBy({
          by: ["referralCodeId", "action"],
          where: { referralCodeId: { in: codeIds } },
          _count: { _all: true },
        });

  const actionSummary = new Map<number, Record<string, number>>();
  for (const group of actionGroups) {
    if (typeof group.referralCodeId !== "number") continue;
    const current = actionSummary.get(group.referralCodeId) ?? {};
    current[group.action] = group._count?._all ?? 0;
    actionSummary.set(group.referralCodeId, current);
  }

  return NextResponse.json({
    referralCodes: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      eventCount: r._count.events,
      actionSummary: actionSummary.get(r.id) ?? {},
      latestEvent: r.events[0]
        ? {
            ...r.events[0],
            createdAt: r.events[0].createdAt.toISOString(),
          }
        : null,
      _count: undefined,
      events: undefined,
    })),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as
    | {
        code?: string;
        label?: string;
        ownerName?: string;
        ownerPhone?: string;
        ownerEmail?: string;
        commission?: string;
        status?: string;
        landingPath?: string;
        notes?: string;
      }
    | null;

  const code = normalizeReferralCode(body?.code);
  const label = String(body?.label ?? "").trim();
  if (!code || !label) {
    return NextResponse.json(
      { error: "Kode dan label wajib diisi" },
      { status: 400 },
    );
  }

  const status = String(body?.status ?? "active").trim() || "active";
  const normalizedStatus = status.slice(0, 30);
  const landingPath = String(body?.landingPath ?? "/m").trim() || "/m";

  const ownerEmail = String(body?.ownerEmail ?? "").trim().toLowerCase().slice(0, 254) || null;
  if (/^active$/i.test(normalizedStatus) && ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    return NextResponse.json(
      { error: "Email pemilik referral tidak valid untuk menautkan ke mitra" },
      { status: 400 },
    );
  }
  if (/^active$/i.test(normalizedStatus) && !ownerEmail) {
    return NextResponse.json(
      { error: "Email pemilik wajib diisi agar mitra bisa login portal /mitra dengan akun desa yang sama" },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.referralCode.create({
        data: {
          code,
          label,
          ownerName: String(body?.ownerName ?? "").trim() || null,
          ownerPhone: String(body?.ownerPhone ?? "").trim() || null,
          ownerEmail: ownerEmail ?? null,
          commission: String(body?.commission ?? "").trim() || null,
          status: normalizedStatus,
          landingPath: landingPath.slice(0, 120),
          notes: String(body?.notes ?? "").trim() || null,
        },
        select: { id: true, code: true, status: true },
      });
      if (String(row.status).toLowerCase() === "active") {
        await provisionPartnerFromReferralCodeTx(tx, row.id);
      }
      return row;
    });

    const withPartner = await prisma.referralCode.findUnique({
      where: { id: created.id },
      select: { id: true, code: true, partnerId: true },
    });

    return NextResponse.json({ ok: true, referralCode: withPartner ?? created }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal membuat referral + mitra";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
