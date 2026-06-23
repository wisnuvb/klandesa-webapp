import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { hashPassword } from "@/lib/auth";
import { ensurePartnerCommissionRule } from "@/lib/partner/commission";
import { ensurePartnerReferralCodeTx } from "@/lib/partner/referral-code";

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
      passwordHash: true,
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

  const approvedAt = new Date().toISOString();

  const { partnerRow, tempPassword, approveInfo, referralCode, sharePath } =
    await prisma.$transaction(async (tx) => {
    /** Hanya ada jika mitra baru & pendaftar tidak punya hash (data lama). */
    let tempPassword: string | null = null;
    /** Penjelasan singkat untuk admin (tanpa menyebut password). */
    let approveInfo!: string;
    const existing = await tx.partner.findUnique({
      where: { email: application.email },
      select: { id: true },
    });

    let row: { id: number };

    if (existing) {
      row = await tx.partner.update({
        where: { id: existing.id },
        data: {
          status: "active",
          name: application.name,
          phone: application.phone,
          region: application.region,
          ...(application.passwordHash
            ? { password: application.passwordHash }
            : {}),
        },
        select: { id: true },
      });
      if (application.passwordHash) {
        approveInfo =
          "Password dari formulir pendaftaran diterapkan ke akun mitra yang sudah ada.";
      } else {
        approveInfo =
          "Email ini sudah terdaftar sebagai mitra — password login tidak diubah.";
      }
    } else if (application.passwordHash) {
      row = await tx.partner.create({
        data: {
          email: application.email,
          password: application.passwordHash,
          name: application.name,
          phone: application.phone,
          region: application.region,
          status: "active",
        },
        select: { id: true },
      });
      approveInfo =
        "Mitra memakai password yang dibuatnya saat mengisi formulir pendaftaran.";
    } else {
      tempPassword = generateTempPassword();
      const hashed = await hashPassword(tempPassword);
      row = await tx.partner.create({
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
      approveInfo =
        "Pendaftar tidak punya kata sandi tersimpan (data lama) — gunakan password sementara di bawah.";
    }

    const prevMeta =
      application.meta && typeof application.meta === "object"
        ? application.meta
        : null;
    const nextMeta = {
      ...(prevMeta as Record<string, unknown> | null),
      approvedAt,
      partnerId: row.id,
      approvedBy: auth.admin.email,
    };

    await tx.partnerApplication.update({
      where: { id: application.id },
      data: { status: "APPROVED", meta: nextMeta },
      select: { id: true },
    });

    await ensurePartnerCommissionRule(tx, row.id);

    const referral = await ensurePartnerReferralCodeTx(tx, row.id, {
      name: application.name,
      email: application.email,
      phone: application.phone,
    });

    const referralSuffix = referral.created
      ? ` Kode referral otomatis: ${referral.code}.`
      : ` Kode referral: ${referral.code}.`;
    approveInfo = `${approveInfo}${referralSuffix}`;

    return {
      partnerRow: row,
      tempPassword,
      approveInfo,
      referralCode: referral.code,
      sharePath: referral.sharePath,
    };
  });

  return NextResponse.json(
    {
      ok: true,
      partnerId: partnerRow.id,
      tempPassword,
      approveInfo,
      referralCode,
      sharePath,
    },
    { status: 200 },
  );
}
