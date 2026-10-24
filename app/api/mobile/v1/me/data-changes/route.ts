import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";
import { canActForMember, maskNik } from "@/lib/mobile/mail-logic";
import {
  CHANGE_FIELDS, CHANGE_STATUS_LABEL, canCorrect, isChangeField, residentValueText, validateChange,
} from "@/lib/mobile/data-change-logic";

const MAX_PENDING = 5;

function shown(field: string, v: string | null): string | null {
  if (v == null) return null;
  return field === "nik" || field === "kk" ? maskNik(v) : v;
}

/** Pengajuan koreksi milik saya (termasuk yang saya ajukan atas nama anggota KK). */
export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const me = await getCitizenResident(loaded.ctx);
  if (!me) return mobileError("FORBIDDEN", "Akses ditolak.", 403);

  const rows = await prisma.dataChangeRequest.findMany({
    where: { villageId: loaded.ctx.villageId, requestedByResidentId: me.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const people = await prisma.resident.findMany({
    where: { villageId: loaded.ctx.villageId, id: { in: [...new Set(rows.map((r) => r.residentId))] } },
    select: { id: true, name: true },
  });
  const nameOf = new Map(people.map((p) => [p.id, p.name]));
  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      forName: nameOf.get(r.residentId) ?? "Anggota keluarga",
      field: r.field,
      fieldLabel: isChangeField(r.field) ? CHANGE_FIELDS[r.field].label : r.field,
      newValue: shown(r.field, r.newValue),
      status: r.status,
      statusLabel: CHANGE_STATUS_LABEL[r.status] ?? r.status,
      applied: r.appliedAt != null,
      reviewNote: r.reviewNote,
      createdAt: r.createdAt,
    })),
  });
}

/** Ajukan koreksi. Data induk tidak berubah sampai perangkat desa memeriksa. */
export async function POST(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const me = await getCitizenResident(ctx);
  if (!me) return mobileError("FORBIDDEN", "Akses ditolak.", 403);

  const body = (await req.json().catch(() => null)) as { residentId?: unknown; field?: unknown; value?: unknown; note?: unknown } | null;
  const targetId = Number(body?.residentId);
  if (!body || !Number.isInteger(targetId) || !isChangeField(body.field)) return mobileError("INVALID_REQUEST", "Permintaan tidak valid.", 400);
  const field = body.field;

  const target = await prisma.resident.findFirst({ where: { id: targetId, villageId: ctx.villageId, isAlive: true } });
  if (!target || !canCorrect({
    requesterId: me.id, requesterKk: me.kk, requesterIsHead: canActForMember(me.familyRole),
    targetId: target.id, targetKk: target.kk, targetVillageId: target.villageId, requesterVillageId: ctx.villageId,
  })) {
    return mobileError("FORBIDDEN", "Anda hanya bisa mengoreksi data diri sendiri atau anggota KK Anda (sebagai kepala keluarga).", 403);
  }

  const current = residentValueText((target as Record<string, unknown>)[field]);
  const v = validateChange(field, body.value, current);
  if (!v.ok) return mobileError("INVALID_REQUEST", v.message, 400, { field: "value" });
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) : "";

  const [pending, duplicate] = await Promise.all([
    prisma.dataChangeRequest.count({ where: { requestedByResidentId: me.id, status: "pending" } }),
    prisma.dataChangeRequest.count({ where: { residentId: target.id, field, status: "pending" } }),
  ]);
  if (duplicate > 0) return mobileError("INVALID_REQUEST", "Pengajuan untuk data ini masih menunggu pemeriksaan desa.", 409);
  if (pending >= MAX_PENDING) return mobileError("RATE_LIMITED", "Masih ada beberapa pengajuan yang menunggu. Tunggu desa memeriksanya dulu.", 429);

  const created = await prisma.dataChangeRequest.create({
    data: { villageId: ctx.villageId, residentId: target.id, requestedByResidentId: me.id, field, oldValue: current, newValue: v.value, note: note || null },
    select: { id: true },
  });
  return NextResponse.json({ id: created.id }, { status: 201 });
}
