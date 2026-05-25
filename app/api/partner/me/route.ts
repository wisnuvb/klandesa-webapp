import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiSession } from "@/lib/api-session";
import { getPartnerSession } from "@/lib/partner-session";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { validatePartnerPasswordPlain } from "@/lib/partner/password-policy";

const MAX_LEN = {
  name: 255,
  phone: 40,
  region: 200,
} as const;

export async function GET(req: NextRequest) {
  const session = await getApiSession(req);
  const partner = getPartnerSession(session);
  if (!partner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.partner.findUnique({
    where: { id: partner.partnerId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      region: true,
      status: true,
    },
  });

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ partner: row }, { status: 200 });
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
      }
    | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const phoneRaw = body.phone == null ? null : String(body.phone).trim();
  const regionRaw = body.region == null ? null : String(body.region).trim();

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

    const existing = await prisma.partner.findUnique({
      where: { id: partner.partnerId },
      select: { password: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const pwdOk = await verifyPassword(currentPassword, existing.password);
    if (!pwdOk) {
      return NextResponse.json(
        { error: "Password saat ini salah." },
        { status: 401 },
      );
    }
  }

  if (!name) return NextResponse.json({ error: "Nama wajib diisi" }, { status: 400 });
  if (name.length > MAX_LEN.name) {
    return NextResponse.json({ error: "Nama terlalu panjang" }, { status: 400 });
  }

  if (phoneRaw && phoneRaw.length > MAX_LEN.phone) {
    return NextResponse.json({ error: "Nomor HP terlalu panjang" }, { status: 400 });
  }
  if (regionRaw && regionRaw.length > MAX_LEN.region) {
    return NextResponse.json({ error: "Wilayah terlalu panjang" }, { status: 400 });
  }

  const hashedNew = changingPassword
    ? await hashPassword(newPassword)
    : undefined;

  const updated = await prisma.partner.update({
    where: { id: partner.partnerId },
    data: {
      name,
      phone: phoneRaw && phoneRaw !== "" ? phoneRaw : null,
      region: regionRaw && regionRaw !== "" ? regionRaw : null,
      ...(hashedNew !== undefined ? { password: hashedNew } : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      region: true,
      status: true,
    },
  });

  return NextResponse.json({ partner: updated }, { status: 200 });
}
