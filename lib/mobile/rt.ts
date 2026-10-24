import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext, type MobileContext } from "./context";
import { getCitizenResident } from "./citizen-data";
import { normalizeRtCode, type RtScope } from "./rt-logic";

export type RtContext = MobileContext & { residentId: number; name: string; scope: RtScope };

/** Penugasan RT aktif milik akun warga ini (kosong bila bukan petugas RT). */
export async function getRtAssignment(villageId: number, residentId: number) {
  const a = await prisma.villageRoleAssignment.findUnique({
    where: { villageId_residentId_role: { villageId, residentId, role: "rt" } },
    select: { isActive: true, rt: true, rw: true },
  });
  const rt = a?.isActive ? normalizeRtCode(a.rt) : null;
  return rt ? ({ rt, rw: normalizeRtCode(a!.rw) } satisfies RtScope) : null;
}

/** Guard endpoint Ketua RT: akun warga + penugasan RT aktif di desa yang sama. Cakupan selalu dari DB, tidak dari klien. */
export async function requireRt(req: NextRequest): Promise<{ ok: true; ctx: RtContext } | { ok: false; response: NextResponse }> {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded;
  const me = await getCitizenResident(loaded.ctx);
  if (!me) return { ok: false, response: mobileError("FORBIDDEN", "Akses ditolak.", 403) };
  const scope = await getRtAssignment(loaded.ctx.villageId, me.id);
  if (!scope) return { ok: false, response: mobileError("FORBIDDEN", "Anda belum ditugaskan sebagai Ketua RT.", 403) };
  return { ok: true, ctx: { ...loaded.ctx, residentId: me.id, name: me.name, scope } };
}

/** Semua penugasan RT aktif di desa (untuk menentukan perlu-tidaknya tahap RT dan siapa yang diberi tahu). */
export async function listActiveRts(villageId: number) {
  const rows = await prisma.villageRoleAssignment.findMany({
    where: { villageId, role: "rt", isActive: true },
    select: { residentId: true, rt: true, rw: true },
    take: 500,
  });
  return rows.map((r) => ({ residentId: r.residentId, rt: normalizeRtCode(r.rt), rw: normalizeRtCode(r.rw) }));
}
