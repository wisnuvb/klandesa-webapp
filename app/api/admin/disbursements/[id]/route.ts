import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { toJSONSafe } from "@/utils/json";
import { actorOf, auditBefore, clip, formatRupiah } from "@/lib/platform/legacy-audit";
import { auditPlatform } from "@/lib/platform/audit";
import { readRisky } from "@/lib/platform/legacy-risky";

function disbursementIdFromParam(raw: string): bigint | null {
  if (!/^\d{1,18}$/.test(raw)) return null;
  const b = BigInt(raw);
  return b >= BigInt(1) ? b : null;
}

/** Dilempar di dalam transaksi bila status berubah menjadi "paid" oleh permintaan lain di antara pemeriksaan dan penulisan. */
class PaidConflict extends Error {}

/** Nama tindakan jejak menurut transisi status (katalog: disbursement.approve|paid|reject). */
function actionFor(from: string, to: string): string {
  if (from === to) return "disbursement.update";
  if (to === "paid") return "disbursement.paid";
  if (to === "failed") return "disbursement.reject";
  if (to === "processing") return "disbursement.approve";
  return "disbursement.update";
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

  // Mengubah status pencairan (diproses/lunas/ditolak) menggerakkan uang: wajib konfirmasi sandi admin + alasan.
  const risky = await readRisky(req, auth.admin);
  if (!risky.ok) return risky.response;
  const body = risky.body as {
    status?: unknown;
    reference?: unknown;
    paidAt?: unknown;
    notes?: unknown;
  };

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
    // Tanggal bayar tidak boleh di masa depan (toleransi 1 hari untuk selisih zona waktu).
    if (d.getTime() > Date.now() + 86_400_000) {
      return NextResponse.json({ error: "paidAt tidak boleh di masa depan" }, { status: 400 });
    }
    paidAt = d;
  }

  const existing = await prisma.partnerDisbursement.findUnique({
    where: { id: rid },
    select: {
      id: true,
      status: true,
      amount: true,
      reference: true,
      paidAt: true,
      partnerId: true,
      partner: { select: { name: true } },
    },
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

  const action = actionFor(existing.status, statusRaw);
  const auditEntry = {
    action,
    targetType: "partner" as const,
    targetId: existing.partnerId,
    summary:
      action === "disbursement.update"
        ? `Mengubah catatan pencairan #${rid} mitra "${existing.partner.name}" (#${existing.partnerId}), status tetap ${statusRaw}`
        : `Pencairan #${rid} mitra "${existing.partner.name}" (#${existing.partnerId}) senilai ${formatRupiah(Number(existing.amount))}: ${existing.status} -> ${statusRaw}`,
    metadata: {
      reason: risky.reason,
      disbursementId: rid.toString(),
      partnerId: existing.partnerId,
      amountIdr: Number(existing.amount),
      before: { status: existing.status, reference: existing.reference, paidAt: existing.paidAt?.toISOString() ?? null },
      after: {
        status: statusRaw,
        reference: reference !== undefined ? reference : existing.reference,
        paidAt:
          statusRaw === "paid"
            ? (paidAt ?? existing.paidAt)?.toISOString() ?? "sekarang"
            : statusRaw === "failed"
              ? null
              : (existing.paidAt?.toISOString() ?? null),
      },
      ...(notesFinal !== undefined ? { notesChanged: true } : {}),
    },
  };
  // Tanda "diproses/lunas" adalah penggerak uang: jejak ketat SEBELUM efek. Penolakan/ubah catatan: jejak biasa setelahnya.
  const strict = action === "disbursement.paid" || action === "disbursement.approve";
  if (strict) {
    const blocked = await auditBefore(req, actorOf(auth), auditEntry);
    if (blocked) return blocked;
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Baca ulang di dalam transaksi: pelunasan tidak boleh dibatalkan oleh permintaan lain yang berlomba.
      const cur = await tx.partnerDisbursement.findUnique({ where: { id: rid }, select: { status: true, paidAt: true } });
      if (!cur) throw new PaidConflict();
      if (cur.status === "paid" && statusRaw !== "paid") throw new PaidConflict();
      const wasPaid = cur.status === "paid";

      await tx.partnerDisbursement.update({
        where: { id: rid },
        data: {
          status: statusRaw,
          ...(reference !== undefined ? { reference } : {}),
          ...(notesFinal !== undefined ? { notes: notesFinal } : {}),
          // Idempoten: menandai lunas dua kali tidak menggeser tanggal bayar kecuali admin menyebut tanggalnya.
          ...(statusRaw === "paid"
            ? { paidAt: paidAt ?? (wasPaid ? (cur.paidAt ?? new Date()) : new Date()) }
            : statusRaw === "failed"
              ? { paidAt: null }
              : {}),
        },
      });

      if (statusRaw === "paid" && !wasPaid) {
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
  } catch (e) {
    if (e instanceof PaidConflict) {
      return NextResponse.json(
        { error: "Disbursement sudah lunas tidak boleh diubah statusnya" },
        { status: 409 },
      );
    }
    throw e;
  }

  if (!strict) {
    await auditPlatform(req, actorOf(auth), {
      ...auditEntry,
      summary: clip(auditEntry.summary, 500),
    });
  }

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
