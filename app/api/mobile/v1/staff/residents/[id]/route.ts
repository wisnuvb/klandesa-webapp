import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { audit, requireStaff } from "@/lib/mobile/staff";
import { maskNik } from "@/lib/mobile/mail-logic";
import { ageFromBirthDate } from "@/lib/mobile/resident-logic";
import { roleCan, normalizeVillageRole } from "@/lib/permissions";

/** Ringkasan penduduk. Hanya data yang dibutuhkan pelayanan; data kesehatan/ekonomi sengaja tidak dikirim ke HP. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireStaff(req, "residents", "read");
  if (!g.ok) return g.response;
  const { ctx } = g;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);

  const r = await prisma.resident.findFirst({
    where: { id, villageId: ctx.villageId },
    select: {
      id: true, name: true, nik: true, kk: true, gender: true, birthplace: true, birthDate: true, religion: true, maritalStatus: true, familyRole: true,
      address: true, rt: true, rw: true, hamlet: true, occupation: true, education: true, phone: true, isAlive: true, moveDate: true,
      citizenAccount: { select: { id: true, status: true, lastLoginAt: true } },
    },
  });
  if (!r) return mobileError("INVALID_REQUEST", "Warga tidak ditemukan.", 404);

  const family = r.kk
    ? await prisma.resident.findMany({ where: { villageId: ctx.villageId, kk: r.kk, id: { not: r.id } }, select: { id: true, name: true, familyRole: true, birthDate: true }, orderBy: { birthDate: "asc" }, take: 20 })
    : [];

  const canManage = roleCan("residents", "update", normalizeVillageRole(ctx.role));
  void audit(ctx, req, "view", "residents", id);
  return NextResponse.json({
    id: r.id, name: r.name, nikMasked: maskNik(r.nik), kkMasked: r.kk ? maskNik(r.kk) : null, gender: r.gender, age: ageFromBirthDate(r.birthDate),
    birthplace: r.birthplace, birthDate: r.birthDate, religion: r.religion, maritalStatus: r.maritalStatus, relation: r.familyRole,
    address: r.address, rt: r.rt, rw: r.rw, hamlet: r.hamlet, occupation: r.occupation, education: r.education, phone: r.phone,
    alive: r.isAlive !== false, moved: !!r.moveDate,
    app: r.citizenAccount ? { status: r.citizenAccount.status, lastLoginAt: r.citizenAccount.lastLoginAt } : null,
    family: family.map((f) => ({ id: f.id, name: f.name, relation: f.familyRole, age: ageFromBirthDate(f.birthDate) })),
    canManageAccess: canManage,
  });
}
