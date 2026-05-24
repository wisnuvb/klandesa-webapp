import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { hashPassword } from "@/lib/auth";
import { ensurePartnerCommissionRule } from "@/lib/partner/commission";

function generateTempPassword(): string {
  return randomBytes(9).toString("base64url");
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  let appId: bigint;
  try {
    appId = BigInt(id);
  } catch {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  const application = await prisma.partnerApplication.findUnique({
    where: { id: appId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      region: true,
      status: true,
      meta: true,
    },
  });

  if (!application) {
    return NextResponse.json(
      { error: "Pendaftaran tidak ditemukan" },
      { status: 404 },
    );
  }
  if (application.status !== "NEW") {
    return NextResponse.json(
      { error: "Pendaftaran sudah diproses" },
      { status: 400 },
    );
  }

  const tempPassword = generateTempPassword();
  const hashed = await hashPassword(tempPassword);
  const approvedAt = new Date().toISOString();

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.partner.findUnique({
      where: { email: application.email },
      select: { id: true },
    });

    const partner = existing
      ? await tx.partner.update({
          where: { id: existing.id },
          data: {
            status: "active",
            name: application.name,
            phone: application.phone,
            region: application.region,
          },
          select: { id: true },
        })
      : await tx.partner.create({
          data: {
            email: application.email,
            password: hashed,
            name: application.name,
            phone: application.phone,
            region: application.region,
            status: "active",
          },
          select: { id: true },
        });

    const prevMeta =
      application.meta && typeof application.meta === "object"
        ? application.meta
        : null;
    const nextMeta = {
      ...(prevMeta as Record<string, unknown> | null),
      approvedAt,
      partnerId: partner.id,
      approvedBy: auth.admin.email,
    };

    await tx.partnerApplication.update({
      where: { id: application.id },
      data: { status: "APPROVED", meta: nextMeta },
      select: { id: true },
    });

    await ensurePartnerCommissionRule(tx, partner.id);

    return partner;
  });

  return NextResponse.json(
    { ok: true, partnerId: result.id, tempPassword },
    { status: 200 },
  );
}
