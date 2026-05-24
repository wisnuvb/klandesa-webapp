import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { toJSONSafe } from "@/utils/json";

function disbursementIdFromParam(raw: string): bigint | null {
  try {
    return BigInt(String(raw));
  } catch {
    return null;
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const rid = disbursementIdFromParam((await ctx.params).id ?? "");
  if (rid == null) {
    return NextResponse.json({ error: "ID disbursement tidak valid" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    status?: unknown;
    reference?: unknown;
    paidAt?: unknown;
    notes?: unknown;
  } | null;

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const statusRaw =
    typeof body.status === "string" ? body.status.trim().toLowerCase() : "";
  if (
    statusRaw !== "pending" &&
    statusRaw !== "processing" &&
    statusRaw !== "paid" &&
    statusRaw !== "failed"
  ) {
    return NextResponse.json(
      { error: "status wajib: pending | processing | paid | failed" },
      { status: 400 },
    );
  }

  const reference =
    typeof body.reference === "string"
      ? body.reference.trim().slice(0, 120)
      : undefined;

  let notesFinal: string | null | undefined;
  if (body.notes === null) notesFinal = null;
  else if (typeof body.notes === "string") notesFinal = body.notes.trim().slice(0, 2000);

  let paidAt: Date | null | undefined;
  if (body.paidAt != null && body.paidAt !== "") {
    const d = new Date(String(body.paidAt));
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "paidAt tidak valid (ISO datetime)" }, { status: 400 });
    }
    paidAt = d;
  }

  const existing = await prisma.partnerDisbursement.findUnique({
    where: { id: rid },
    select: { id: true, status: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Disbursement tidak ditemukan" }, { status: 404 });
  }

  if (existing.status === "paid" && statusRaw !== "paid") {
    return NextResponse.json(
      { error: "Disbursement sudah lunas tidak boleh diubah statusnya" },
      { status: 409 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.partnerDisbursement.update({
      where: { id: rid },
      data: {
        status: statusRaw,
        ...(reference !== undefined ? { reference } : {}),
        ...(notesFinal !== undefined ? { notes: notesFinal } : {}),
        ...(statusRaw === "paid"
          ? { paidAt: paidAt ?? new Date() }
          : statusRaw === "failed"
            ? { paidAt: null }
            : {}),
      },
    });

    if (statusRaw === "paid") {
      const items = await tx.partnerDisbursementItem.findMany({
        where: { disbursementId: rid },
        select: { commissionEntryId: true },
      });
      if (items.length === 0) return;
      await tx.partnerCommissionEntry.updateMany({
        where: { id: { in: items.map((i) => i.commissionEntryId) } },
        data: { status: "disbursed" },
      });
    }
  });

  const full = await prisma.partnerDisbursement.findUnique({
    where: { id: rid },
    include: {
      items: {
        include: {
          commissionEntry: {
            select: {
              id: true,
              type: true,
              amount: true,
              villageId: true,
              status: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json(toJSONSafe({ ok: true, disbursement: full }), { status: 200 });
}
