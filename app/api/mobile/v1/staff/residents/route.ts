import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { audit, requireStaff } from "@/lib/mobile/staff";
import { checkMobileRateLimit } from "@/lib/mobile/rate-limit";
import { maskNik } from "@/lib/mobile/mail-logic";
import { ageFromBirthDate, planResidentSearch } from "@/lib/mobile/resident-logic";

/** Cari warga: nama (≥3 huruf) atau NIK/KK 16 digit persis. NIK selalu disamarkan di daftar. */
export async function GET(req: NextRequest) {
  const g = await requireStaff(req, "residents", "read");
  if (!g.ok) return g.response;
  const { ctx } = g;
  const rl = checkMobileRateLimit(`resident-search:${ctx.userId}`, { max: 30, windowMs: 60_000 });
  if (!rl.ok) return mobileError("RATE_LIMITED", "Terlalu banyak pencarian. Coba lagi sebentar.", 429, { retryAfterSec: rl.retryAfterSec });

  const plan = planResidentSearch(req.nextUrl.searchParams.get("q"));
  if (plan.kind === "none") return NextResponse.json({ items: [], hint: "Ketik minimal 3 huruf nama, atau NIK/KK 16 angka." });

  // Jejak pencarian (bukan hasil) untuk mendeteksi penarikan data massal oleh akun staf yang bocor.
  void audit(ctx, req, "search", "residents", "-", { kind: plan.kind, len: plan.kind === "name" ? plan.term.length : 16 });

  const rows = await prisma.resident.findMany({
    where: {
      villageId: ctx.villageId,
      ...(plan.kind === "nik-or-kk" ? { OR: [{ nik: plan.digits }, { kk: plan.digits }] } : { name: { contains: plan.term } }),
    },
    select: { id: true, name: true, nik: true, gender: true, birthDate: true, rt: true, rw: true, hamlet: true, familyRole: true, isAlive: true, citizenAccount: { select: { id: true } } },
    orderBy: { name: "asc" },
    take: 20,
  });
  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id, name: r.name, nikMasked: maskNik(r.nik), gender: r.gender, age: ageFromBirthDate(r.birthDate), rt: r.rt, rw: r.rw, hamlet: r.hamlet,
      relation: r.familyRole, alive: r.isAlive !== false, hasApp: !!r.citizenAccount,
    })),
  });
}
