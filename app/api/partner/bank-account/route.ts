import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiSession } from "@/lib/api-session";
import { getPartnerSession } from "@/lib/partner-session";

const MAX_LEN = {
  bankName: 80,
  accountNumber: 40,
  accountName: 120,
} as const;

export async function GET(req: NextRequest) {
  const session = await getApiSession(req);
  const partner = getPartnerSession(session);
  if (!partner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.partnerBankAccount.findFirst({
    where: { partnerId: partner.partnerId },
    orderBy: [{ isPrimary: "desc" }, { id: "desc" }],
    select: {
      bankName: true,
      accountNumber: true,
      accountName: true,
      verifiedAt: true,
    },
  });

  return NextResponse.json({ bankAccount: row ?? null }, { status: 200 });
}

export async function PUT(req: NextRequest) {
  const session = await getApiSession(req);
  const partner = getPartnerSession(session);
  if (!partner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { bankName?: unknown; accountNumber?: unknown; accountName?: unknown }
    | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const bankName = String(body.bankName ?? "").trim();
  const accountNumber = String(body.accountNumber ?? "").trim();
  const accountName = String(body.accountName ?? "").trim();

  if (!bankName || !accountNumber || !accountName) {
    return NextResponse.json(
      { error: "Nama bank, nomor rekening, dan nama pemilik wajib diisi" },
      { status: 400 },
    );
  }
  if (bankName.length > MAX_LEN.bankName) {
    return NextResponse.json({ error: "Nama bank terlalu panjang" }, { status: 400 });
  }
  if (accountNumber.length > MAX_LEN.accountNumber) {
    return NextResponse.json({ error: "Nomor rekening terlalu panjang" }, { status: 400 });
  }
  if (accountName.length > MAX_LEN.accountName) {
    return NextResponse.json({ error: "Nama pemilik terlalu panjang" }, { status: 400 });
  }

  const existing = await prisma.partnerBankAccount.findFirst({
    where: { partnerId: partner.partnerId },
    orderBy: [{ isPrimary: "desc" }, { id: "desc" }],
    select: { id: true },
  });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.partnerBankAccount.updateMany({
      where: { partnerId: partner.partnerId },
      data: { isPrimary: false },
    });

    if (existing) {
      return tx.partnerBankAccount.update({
        where: { id: existing.id },
        data: {
          bankName,
          accountNumber,
          accountName,
          isPrimary: true,
        },
        select: {
          bankName: true,
          accountNumber: true,
          accountName: true,
          verifiedAt: true,
        },
      });
    }

    return tx.partnerBankAccount.create({
      data: {
        partnerId: partner.partnerId,
        bankName,
        accountNumber,
        accountName,
        isPrimary: true,
      },
      select: {
        bankName: true,
        accountNumber: true,
        accountName: true,
        verifiedAt: true,
      },
    });
  });

  return NextResponse.json({ bankAccount: updated }, { status: 200 });
}
