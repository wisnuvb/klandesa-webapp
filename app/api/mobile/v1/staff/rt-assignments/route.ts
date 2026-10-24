import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { audit, requireStaff } from "@/lib/mobile/staff";
import { maskNik } from "@/lib/mobile/mail-logic";
import { normalizeRtCode } from "@/lib/mobile/rt-logic";

/** Daftar Ketua RT yang ditugaskan di desa. */
export async function GET(req: NextRequest) {
  const g = await requireStaff(req, "settings", "read");
  if (!g.ok) return g.response;
  const rows = await prisma.villageRoleAssignment.findMany({
    where: { villageId: g.ctx.villageId, role: "rt", isActive: true },
    orderBy: [{ rw: "asc" }, { rt: "asc" }],
    take: 300,
  });
  const people = await prisma.resident.findMany({
    where: { villageId: g.ctx.villageId, id: { in: rows.map((r) => r.residentId) } },
    select: { id: true, name: true, nik: true },
  });
  const by = new Map(people.map((p) => [p.id, p]));
  const accounts = await prisma.citizenAccount.findMany({
    where: { residentId: { in: rows.map((r) => r.residentId) }, status: "ACTIVE" }, select: { residentId: true },
  });
  const hasApp = new Set(accounts.map((a) => a.residentId));
  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id, residentId: r.residentId, name: by.get(r.residentId)?.name ?? "Warga", nikMasked: by.get(r.residentId) ? maskNik(by.get(r.residentId)!.nik) : null,
      rt: r.rt, rw: r.rw, hasAccount: hasApp.has(r.residentId),
    })),
  });
}

/** Tugaskan seorang warga sebagai Ketua RT. RT/RW diambil dari isian atau dari data warga itu sendiri. */
export async function POST(req: NextRequest) {
  const g = await requireStaff(req, "settings", "update");
  if (!g.ok) return g.response;
  const { ctx } = g;
  const body = (await req.json().catch(() => null)) as { residentId?: unknown; rt?: unknown; rw?: unknown } | null;
  const residentId = Number(body?.residentId);
  if (!Number.isInteger(residentId)) return mobileError("INVALID_REQUEST", "Pilih warga yang akan ditugaskan.", 400);

  const resident = await prisma.resident.findFirst({ where: { id: residentId, villageId: ctx.villageId, isAlive: true }, select: { id: true, rt: true, rw: true } });
  if (!resident) return mobileError("INVALID_REQUEST", "Warga tidak ditemukan.", 404);
  const rt = normalizeRtCode(body?.rt ?? resident.rt);
  const rw = normalizeRtCode(body?.rw ?? resident.rw);
  if (!rt) return mobileError("INVALID_REQUEST", "Isi nomor RT yang benar (angka).", 400, { field: "rt" });

  const saved = await prisma.villageRoleAssignment.upsert({
    where: { villageId_residentId_role: { villageId: ctx.villageId, residentId, role: "rt" } },
    create: { villageId: ctx.villageId, residentId, role: "rt", rt, rw, createdById: ctx.userId },
    update: { rt, rw, isActive: true },
    select: { id: true },
  });
  void audit(ctx, req, "assign_rt", "village_role_assignments", saved.id, { residentId, rt, rw });
  return NextResponse.json({ id: saved.id }, { status: 201 });
}
