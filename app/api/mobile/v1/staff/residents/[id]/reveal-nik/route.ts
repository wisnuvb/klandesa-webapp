import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { audit, requireStaff } from "@/lib/mobile/staff";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";

/** Tampilkan NIK/KK lengkap. Setiap permintaan dicatat di AuditLog dan dibatasi 30 per jam per pengguna. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireStaff(req, "residents", "read");
  if (!g.ok) return g.response;
  const { ctx } = g;
  const rl = await checkRateLimitDb(limiterKey("reveal-nik", ctx.userId), { max: 30, windowMs: 60 * 60_000 });
  if (!rl.ok) return mobileError("RATE_LIMITED", "Batas melihat NIK lengkap per jam tercapai.", 429, { retryAfterSec: rl.retryAfterSec });

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  const r = await prisma.resident.findFirst({ where: { id, villageId: ctx.villageId }, select: { nik: true, kk: true } });
  if (!r) return mobileError("INVALID_REQUEST", "Warga tidak ditemukan.", 404);
  await audit(ctx, req, "reveal_nik", "residents", id);
  return NextResponse.json({ nik: r.nik, kk: r.kk });
}
