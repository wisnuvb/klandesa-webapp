import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { toJSONSafe } from "@/utils/json";

function partnerIdFromParam(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.floor(n) : null;
}

function parseBigInts(ids: unknown): { ok: true; ids: bigint[] } | { ok: false } {
  if (!Array.isArray(ids)) return { ok: false };
  const out: bigint[] = [];
  for (const x of ids) {
    try {
      if (typeof x !== "number" && typeof x !== "string") return { ok: false };
      const b = BigInt(String(x));
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

  const partner = await prisma.partner.findUnique({ where: { id: pid }, select: { id: true } });
  if (!partner) return NextResponse.json({ error: "Mitra tidak ditemukan" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as {
    approveAll?: unknown;
    ids?: unknown;
  } | null;

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

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
    idFilter = parsed.ids;
  }

  const result = await prisma.partnerCommissionEntry.updateMany({
    where: {
      partnerId: pid,
      status: "accrued",
      ...(approveAll ? {} : { id: { in: idFilter! } }),
    },
    data: { status: "approved" },
  });

  return NextResponse.json(toJSONSafe({ ok: true, approved: result.count }), { status: 200 });
}
