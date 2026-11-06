import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { toJSONSafe } from "@/utils/json";
import { readRisky } from "@/lib/platform/legacy-risky";
import { actorOf, auditBefore, formatRupiah, parsePositiveInt } from "@/lib/platform/legacy-audit";

/** Batas ids per permintaan (approveAll tidak memakai daftar ids). */
const MAX_IDS = 500;

const partnerIdFromParam = (raw: string): number | null => parsePositiveInt(raw);

function parseBigInts(ids: unknown): { ok: true; ids: bigint[] } | { ok: false } {
  if (!Array.isArray(ids) || ids.length > MAX_IDS) return { ok: false };
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

  // Menyetujui komisi membuka jalan bagi pencairan uang: wajib konfirmasi sandi admin + alasan.
  const risky = await readRisky(req, auth.admin);
  if (!risky.ok) return risky.response;
  const body = risky.body as {
    approveAll?: unknown;
    ids?: unknown;
  };

  const partner = await prisma.partner.findUnique({ where: { id: pid }, select: { id: true, name: true } });
  if (!partner) return NextResponse.json({ error: "Mitra tidak ditemukan" }, { status: 404 });

  const approveAll = body.approveAll === true;
  const parsed = parseBigInts(body.ids);

  let idFilter: bigint[] | undefined;
  if (!approveAll) {
    if (!parsed.ok || parsed.ids.length === 0) {
      return NextResponse.json(
        {
          error: "Gunakan approveAll:true atau kirim ids berisi satu atau lebih bigint (string)",
        },
        { status: 400 },
      );
    }
    idFilter = [...new Set(parsed.ids.map((b) => b.toString()))].map((x) => BigInt(x));
  }

  const where = {
    partnerId: pid,
    status: "accrued",
    ...(approveAll ? {} : { id: { in: idFilter! } }),
  };

  // Menyetujui komisi = membuka jalan bagi pencairan uang: jejak (ketat) ditulis SEBELUM status berubah.
  // Hanya baris berstatus accrued yang terpengaruh, jadi mengulang permintaan yang sama tidak menggandakan apa pun.
  const agg = await prisma.partnerCommissionEntry.aggregate({ where, _count: { _all: true }, _sum: { amount: true } });
  const expected = agg._count._all;
  if (expected > 0) {
    const total = Number(agg._sum.amount ?? 0);
    const blocked = await auditBefore(req, actorOf(auth), {
      action: "partner.commission_approve",
      targetType: "partner",
      targetId: pid,
      summary: `Menyetujui ${expected} komisi accrued mitra "${partner.name}" (#${pid}) senilai ${formatRupiah(total)}`,
      metadata: {
        reason: risky.reason,
        mode: approveAll ? "approveAll" : "ids",
        count: expected,
        totalIdr: total,
        ...(approveAll ? {} : { entryIds: idFilter!.map((b) => b.toString()) }),
      },
    });
    if (blocked) return blocked;
  }

  const result = await prisma.partnerCommissionEntry.updateMany({ where, data: { status: "approved" } });

  return NextResponse.json(toJSONSafe({ ok: true, approved: result.count }), { status: 200 });
}
