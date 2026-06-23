import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiSession } from "@/lib/api-session";
import { getPartnerSession } from "@/lib/partner-session";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { validatePartnerPasswordPlain } from "@/lib/partner/password-policy";
import {
  PUBLIC_PAGE_MAX_LEN,
  buildPartnerShareUrl,
  normalizePublicSlug,
  normalizeWhatsappDigits,
  validatePublicSlug,
} from "@/lib/partner/public-page";

const MAX_LEN = {
  name: 255,
  phone: 40,
  region: 200,
} as const;

const partnerSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  region: true,
  status: true,
  publicSlug: true,
  publicHeadline: true,
  publicBio: true,
  publicWhatsapp: true,
  publicPageEnabled: true,
  referralCode: {
    select: {
      code: true,
      status: true,
    },
  },
} as const;

function requestOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:2042";
}

function serializePartner(row: {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  region: string | null;
  status: string;
  publicSlug: string | null;
  publicHeadline: string | null;
  publicBio: string | null;
  publicWhatsapp: string | null;
  publicPageEnabled: boolean;
  referralCode: { code: string; status: string } | null;
}, origin: string) {
  const referralCode = row.referralCode?.code ?? null;
  const shareUrl =
    row.publicPageEnabled &&
    row.status === "active" &&
    row.referralCode?.status === "active"
      ? buildPartnerShareUrl(origin, row.publicSlug, referralCode)
      : null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    region: row.region,
    status: row.status,
    publicSlug: row.publicSlug,
    publicHeadline: row.publicHeadline,
    publicBio: row.publicBio,
    publicWhatsapp: row.publicWhatsapp,
    publicPageEnabled: row.publicPageEnabled,
    referralCode,
    referralStatus: row.referralCode?.status ?? null,
    shareUrl,
  };
}

export async function GET(req: NextRequest) {
  const session = await getApiSession(req);
  const partner = getPartnerSession(session);
  if (!partner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.partner.findUnique({
    where: { id: partner.partnerId },
    select: partnerSelect,
  });

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(
    { partner: serializePartner(row, requestOrigin(req)) },
    { status: 200 },
  );
}

export async function PUT(req: NextRequest) {
  const session = await getApiSession(req);
  const partner = getPartnerSession(session);
  if (!partner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | {
        name?: unknown;
        phone?: unknown;
        region?: unknown;
        currentPassword?: unknown;
        newPassword?: unknown;
        confirmPassword?: unknown;
        publicSlug?: unknown;
        publicHeadline?: unknown;
        publicBio?: unknown;
        publicWhatsapp?: unknown;
        publicPageEnabled?: unknown;
      }
    | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const hasPublicFields =
    "publicSlug" in body ||
    "publicHeadline" in body ||
    "publicBio" in body ||
    "publicWhatsapp" in body ||
    "publicPageEnabled" in body;

  const hasProfileFields =
    "name" in body || "phone" in body || "region" in body;

  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";
  const confirmPassword =
    typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";

  const changingPassword =
    newPassword.length > 0 ||
    confirmPassword.length > 0 ||
    currentPassword.length > 0;

  const existing = await prisma.partner.findUnique({
    where: { id: partner.partnerId },
    select: { password: true, name: true, phone: true, region: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (changingPassword) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Password saat ini wajib untuk mengubah kata sandi." },
        { status: 400 },
      );
    }
    const pwErr = validatePartnerPasswordPlain(newPassword);
    if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Konfirmasi password baru tidak sama." },
        { status: 400 },
      );
    }
    const pwdOk = await verifyPassword(currentPassword, existing.password);
    if (!pwdOk) {
      return NextResponse.json(
        { error: "Password saat ini salah." },
        { status: 401 },
      );
    }
  }

  const updateData: {
    name?: string;
    phone?: string | null;
    region?: string | null;
    password?: string;
    publicSlug?: string | null;
    publicHeadline?: string | null;
    publicBio?: string | null;
    publicWhatsapp?: string | null;
    publicPageEnabled?: boolean;
  } = {};

  if (hasProfileFields || changingPassword) {
    const name = String(body.name ?? existing.name).trim();
    const phoneRaw = body.phone == null ? existing.phone : String(body.phone).trim();
    const regionRaw =
      body.region == null ? existing.region : String(body.region).trim();

    if (!name) {
      return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
    }
    if (name.length > MAX_LEN.name) {
      return NextResponse.json({ error: "Nama terlalu panjang" }, { status: 400 });
    }
    if (phoneRaw && phoneRaw.length > MAX_LEN.phone) {
      return NextResponse.json({ error: "Nomor HP terlalu panjang" }, { status: 400 });
    }
    if (regionRaw && regionRaw.length > MAX_LEN.region) {
      return NextResponse.json({ error: "Wilayah terlalu panjang" }, { status: 400 });
    }

    updateData.name = name;
    updateData.phone = phoneRaw && phoneRaw !== "" ? phoneRaw : null;
    updateData.region = regionRaw && regionRaw !== "" ? regionRaw : null;
  }

  if (changingPassword) {
    updateData.password = await hashPassword(newPassword);
  }

  if (hasPublicFields) {
    if ("publicSlug" in body) {
      const rawSlug = body.publicSlug;
      if (rawSlug == null || String(rawSlug).trim() === "") {
        updateData.publicSlug = null;
      } else {
        const slugErr = validatePublicSlug(rawSlug);
        if (slugErr) return NextResponse.json({ error: slugErr }, { status: 400 });
        const normalized = normalizePublicSlug(rawSlug);
        if (!normalized) {
          return NextResponse.json({ error: "Slug tidak valid." }, { status: 400 });
        }
        const taken = await prisma.partner.findFirst({
          where: {
            publicSlug: normalized,
            NOT: { id: partner.partnerId },
          },
          select: { id: true },
        });
        if (taken) {
          return NextResponse.json(
            { error: "Slug sudah dipakai mitra lain." },
            { status: 409 },
          );
        }
        updateData.publicSlug = normalized;
      }
    }

    if ("publicHeadline" in body) {
      const headline =
        body.publicHeadline == null
          ? null
          : String(body.publicHeadline).trim().slice(0, PUBLIC_PAGE_MAX_LEN.headline);
      updateData.publicHeadline = headline || null;
    }

    if ("publicBio" in body) {
      const bio =
        body.publicBio == null
          ? null
          : String(body.publicBio).trim().slice(0, PUBLIC_PAGE_MAX_LEN.bio);
      updateData.publicBio = bio || null;
    }

    if ("publicWhatsapp" in body) {
      const waRaw = body.publicWhatsapp;
      if (waRaw == null || String(waRaw).trim() === "") {
        updateData.publicWhatsapp = null;
      } else {
        const digits = normalizeWhatsappDigits(waRaw);
        if (!digits) {
          return NextResponse.json(
            { error: "Nomor WhatsApp tidak valid." },
            { status: 400 },
          );
        }
        updateData.publicWhatsapp = digits;
      }
    }

    if ("publicPageEnabled" in body) {
      updateData.publicPageEnabled = Boolean(body.publicPageEnabled);
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Tidak ada data untuk disimpan." }, { status: 400 });
  }

  const updated = await prisma.partner.update({
    where: { id: partner.partnerId },
    data: updateData,
    select: partnerSelect,
  });

  return NextResponse.json(
    { partner: serializePartner(updated, requestOrigin(req)) },
    { status: 200 },
  );
}
