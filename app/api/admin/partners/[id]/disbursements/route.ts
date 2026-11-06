import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { Prisma } from "@prisma/client";
import { readRisky } from "@/lib/platform/legacy-risky";
import { toJSONSafe } from "@/utils/json";
import { actorOf, auditBefore, formatRupiah, maskAccountNumber, parsePositiveInt } from "@/lib/platform/legacy-audit";

/** Batas entri komisi per batch pencairan. */
const MAX_ENTRIES = 200;

const partnerIdFromParam = (raw: string): number | null => parsePositiveInt(raw);

function parseBigInts(ids: unknown): { ok: true; ids: bigint[] } | { ok: false } {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_ENTRIES) return { ok: false };
  const out: bigint[] = [];
  for (const x of ids) {
    try {
      if (typeof x !== "number" && typeof x !== "string") return { ok: false };
      const b = BigInt(String(x));
      if (b < BigInt(1)) return { ok: false };
      out.push(b);
    } catch {
      return { ok: false };
    }
  }
  return { ok: true, ids: out };
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const pid = partnerIdFromParam((await ctx.params).id ?? "");
  if (pid == null) {
    return NextResponse.json({ error: "ID mitra tidak valid" }, { status: 400 });
  }

  // Membuat batch pencairan komisi menggerakkan uang: wajib konfirmasi sandi admin + alasan.
  const risky = await readRisky(req, auth.admin);
  if (!risky.ok) return risky.response;
  const body = risky.body as {
    commissionEntryIds?: unknown;
    notes?: unknown;
    status?: unknown;
    reference?: unknown;
  };

  const partner = await prisma.partner.findUnique({
    where: { id: pid },
    select: { id: true, name: true },
  });
  if (!partner) return NextResponse.json({ error: "Mitra tidak ditemukan" }, { status: 404 });

  const parsed = parseBigInts(body.commissionEntryIds);
  if (!parsed.ok) {
    return NextResponse.json({ error: "commissionEntryIds wajib berisi array bigint" }, { status: 400 });
  }

  const initialStatusRaw = typeof body.status === "string" ? body.status.trim() : "";
  const initialStatus =
    initialStatusRaw === "processing"
      ? "processing"
      : initialStatusRaw === "paid"
        ? "paid"
        : initialStatusRaw === "failed"
          ? "failed"
          : "pending";

  const entries = await prisma.partnerCommissionEntry.findMany({
    where: {
      id: { in: parsed.ids },
      partnerId: pid,
      status: "approved",
      disbursementItem: null,
    },
    select: { id: true, amount: true },
  });

  if (entries.length !== parsed.ids.length) {
    return NextResponse.json(
      {
        error:
          "Beberapa entri tidak ditemukan, bukan approved, atau sudah masuk disbursement lain",
      },
      { status: 400 },
    );
  }

  const totalMinor = entries.reduce((s, e) => s + Number(e.amount), 0);
  if (!Number.isFinite(totalMinor)) {
    return NextResponse.json({ error: "Gagal menjumlahkan komisi" }, { status: 400 });
  }

  const bank =
    (await prisma.partnerBankAccount.findFirst({
      where: { partnerId: pid, isPrimary: true },
    })) ??
    (await prisma.partnerBankAccount.findFirst({
      where: { partnerId: pid },
      orderBy: { id: "asc" },
    }));

  if (!bank) {
    return NextResponse.json(
      { error: "Mitra belum punya rekening utama — minta lengkapi di portal mitra." },
      { status: 400 },
    );
  }

  const notes =
    typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : null;
  const referenceIn =
    typeof body.reference === "string" ? body.reference.trim().slice(0, 120) : null;

  const disburseRowStatus =
    initialStatus === "paid"
      ? "paid"
      : initialStatus === "processing"
        ? "processing"
        : initialStatus === "failed"
          ? "failed"
          : "pending";

  // Pencairan menggerakkan uang: jejak (ketat) ditulis SEBELUM batch dibuat. Nomor rekening hanya disamarkan.
  const blocked = await auditBefore(req, actorOf(auth), {
    action: disburseRowStatus === "paid" ? "disbursement.paid" : "disbursement.create",
    targetType: "partner",
    targetId: pid,
    summary: `${disburseRowStatus === "paid" ? "Membuat & menandai LUNAS" : "Membuat"} pencairan komisi mitra "${partner.name}" (#${pid}) senilai ${formatRupiah(totalMinor)} untuk ${entries.length} entri`,
    metadata: {
      reason: risky.reason,
      status: disburseRowStatus,
      totalIdr: totalMinor,
      entryCount: entries.length,
      commissionEntryIds: entries.map((e) => e.id.toString()),
      bankName: bank.bankName,
      accountNumberMasked: maskAccountNumber(bank.accountNumber),
      reference: referenceIn || null,
    },
  });
  if (blocked) return blocked;

  let disbursementId: bigint;
  try {
    disbursementId = await prisma.$transaction(async (tx) => {
    const disp = await tx.partnerDisbursement.create({
      data: {
        partnerId: pid,
        amount: totalMinor,
        status: disburseRowStatus,
        bankName: bank.bankName,
        accountNumber: bank.accountNumber,
        accountName: bank.accountName,
        reference:
          referenceIn && referenceIn.length > 0
            ? referenceIn
            : disburseRowStatus === "paid"
              ? `AUTO-${Date.now()}`
              : null,
        paidAt: disburseRowStatus === "paid" ? new Date() : null,
        notes,
        createdByPlatformUserId: auth.admin.platformUserId,
      },
      select: { id: true },
    });

    for (const entry of entries) {
      await tx.partnerDisbursementItem.create({
        data: {
          disbursementId: disp.id,
          commissionEntryId: entry.id,
        },
      });
    }

    if (disburseRowStatus === "paid") {
      await tx.partnerCommissionEntry.updateMany({
        where: { id: { in: entries.map((e) => e.id) } },
        data: { status: "disbursed" },
      });
    }

    return disp.id;
    });
  } catch (e) {
    // Kolom unik commissionEntryId: dua permintaan bersamaan untuk entri yang sama -> salah satunya ditolak (tanpa pencairan ganda).
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "Beberapa entri tidak ditemukan, bukan approved, atau sudah masuk disbursement lain" },
        { status: 409 },
      );
    }
    throw e;
  }

  const full = await prisma.partnerDisbursement.findUnique({
    where: { id: disbursementId },
    include: {
      items: {
        include: {
          commissionEntry: {
            select: {
              id: true,
              type: true,
              amount: true,
              villageId: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json(toJSONSafe({ ok: true, disbursement: full }), { status: 200 });
}
