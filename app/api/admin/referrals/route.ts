import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { normalizeReferralCode } from "@/lib/referrals/tracking";
import { provisionPartnerFromReferralCodeTx } from "@/lib/partner/provision";
import { readRisky } from "@/lib/platform/legacy-risky";
import { Prisma } from "@prisma/client";
import { auditPlatform } from "@/lib/platform/audit";
import { actorOf, clip } from "@/lib/platform/legacy-audit";

/** Jalur lokal saja ("/m", "/tim"): tanpa skema/host ("//x", "https://x", "@x") karena disambung ke origin saat membuat tautan. */
function safeLandingPath(raw: string): string | null {
  const p = raw.trim() || "/m";
  if (!/^\/[A-Za-z0-9/_\-.]*$/.test(p) || p.startsWith("//") || p.includes("..")) return null;
  return p.slice(0, 120);
}

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

  // Membuat kode referral dapat membuat/menautkan akun Mitra + aturan komisi (uang): wajib konfirmasi sandi + alasan.
  const risky = await readRisky(req, auth.admin);
  if (!risky.ok) return risky.response;
  const body = risky.body as {
    code?: string;
    label?: string;
    ownerName?: string;
    ownerPhone?: string;
    ownerEmail?: string;
    commission?: string;
    status?: string;
    landingPath?: string;
    notes?: string;
  };

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
  const landingPath = safeLandingPath(String(body?.landingPath ?? "/m"));
  if (!landingPath) {
    return NextResponse.json({ error: "landingPath harus berupa jalur lokal seperti /m" }, { status: 400 });
  }
  // Batas panjang sesuai kolom DB (tanpa ini, input panjang menjadi galat basis data).
  if (label.length > 120) return NextResponse.json({ error: "Label maksimal 120 karakter" }, { status: 400 });
  const ownerName = String(body?.ownerName ?? "").trim();
  const ownerPhone = String(body?.ownerPhone ?? "").trim();
  const commission = String(body?.commission ?? "").trim();
  const notes = String(body?.notes ?? "").trim();
  if (ownerName.length > 120 || ownerPhone.length > 40 || commission.length > 80 || notes.length > 5000) {
    return NextResponse.json({ error: "Salah satu isian terlalu panjang" }, { status: 400 });
  }

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
          ownerName: ownerName || null,
          ownerPhone: ownerPhone || null,
          ownerEmail: ownerEmail ?? null,
          commission: commission || null,
          status: normalizedStatus,
          landingPath,
          notes: notes || null,
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

    await auditPlatform(req, actorOf(auth), {
      action: "referral.create",
      targetType: withPartner?.partnerId != null ? "partner" : "system",
      targetId: withPartner?.partnerId != null ? withPartner.partnerId : `referral:${created.id}`,
      summary: `Membuat kode referral "${created.code}" (${clip(label, 80)})${withPartner?.partnerId != null ? `, tertaut mitra #${withPartner.partnerId}` : ""}`,
      metadata: {
        referralCodeId: created.id,
        code: created.code,
        status: created.status,
        partnerId: withPartner?.partnerId ?? null,
        commission: commission || null,
        landingPath,
      },
    });

    return NextResponse.json({ ok: true, referralCode: withPartner ?? created }, { status: 201 });
  } catch (e) {
    // Pesan galat Prisma/SQL tidak boleh bocor ke klien; pesan Error biasa dari layanan (sudah Bahasa Indonesia) dipertahankan.
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: e.code === "P2002" ? "Kode referral atau mitra untuk email ini sudah ada" : "Gagal membuat referral + mitra" },
        { status: 400 },
      );
    }
    if (e instanceof Error && !/prisma|invocation|\bSQL\b/i.test(e.message)) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Gagal membuat referral + mitra" }, { status: 400 });
  }
}
