import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { requireRt } from "@/lib/mobile/rt";
import { maskNik } from "@/lib/mobile/mail-logic";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { residentInScope, rtCodeVariants } from "@/lib/mobile/rt-logic";

/** Warga di RT/RW petugas. NIK tersamar, tanpa telepon/alamat lengkap. Dibatasi 40 pencarian per menit per akun. */
export async function GET(req: NextRequest) {
  const g = await requireRt(req);
  if (!g.ok) return g.response;
  const { ctx } = g;

  const rl = await checkRateLimitDb(limiterKey("rt-residents", ctx.accountId), { max: 40, windowMs: 60_000 });
  if (!rl.ok) return mobileError("RATE_LIMITED", "Terlalu banyak pencarian. Coba lagi sebentar.", 429, { retryAfterSec: rl.retryAfterSec });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  const rows = await prisma.resident.findMany({
    where: {
      villageId: ctx.villageId, isAlive: true, rt: { in: rtCodeVariants(ctx.scope.rt) },
      ...(q.length >= 2 ? { name: { contains: q } } : {}),
    },
    select: { id: true, name: true, nik: true, kk: true, familyRole: true, birthDate: true, gender: true, rt: true, rw: true },
    orderBy: [{ kk: "asc" }, { birthDate: "asc" }],
    take: 300,
  });
  const inScope = rows.filter((r) => residentInScope(r, ctx.scope)).slice(0, 100);
  return NextResponse.json({
    items: inScope.map((r) => ({ id: r.id, name: r.name, nikMasked: maskNik(r.nik), familyRole: r.familyRole, birthDate: r.birthDate, gender: r.gender, kkMasked: r.kk ? maskNik(r.kk) : null })),
    capped: inScope.length >= 100,
  });
}
