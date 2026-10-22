import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";
import { canActForMember, describeMailRequest } from "@/lib/mobile/mail-logic";
import { notifyVillageStaff } from "@/lib/mobile/notify";

function requestNumber(villageCode: string): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `MOB-${villageCode.toUpperCase()}-${ymd}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

/** Riwayat permohonan surat milik warga (terbaru dulu). */
export async function GET(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const me = await getCitizenResident(loaded.ctx);
  if (!me) return mobileError("FORBIDDEN", "Akses ditolak.", 403);

  const rows = await prisma.mailRequest.findMany({
    where: { villageId: loaded.ctx.villageId, residentId: me.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    items: rows.map((r) => {
      const v = describeMailRequest(r, false);
      return {
        id: Number(r.id), number: r.requestNumber, type: r.mailType, forName: r.name,
        status: r.status, stage: v.stage, title: v.title, createdAt: r.requestDate,
      };
    }),
  });
}

/** Ajukan surat. Data pemohon diambil dari Resident, bukan dari klien. */
export async function POST(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const me = await getCitizenResident(ctx);
  if (!me) return mobileError("FORBIDDEN", "Akses ditolak.", 403);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const templateId = Number(body?.templateId);
  const purpose = typeof body?.purpose === "string" ? body.purpose.trim() : "";
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : "";
  if (!Number.isInteger(templateId) || purpose.length < 3 || purpose.length > 300) {
    return mobileError("INVALID_REQUEST", "Pilih jenis surat dan isi keperluan (3–300 huruf).", 400);
  }

  const template = await prisma.mailTemplate.findFirst({
    where: { id: templateId, isActive: true, OR: [{ villageId: ctx.villageId }, { isGlobal: true, villageId: null }] },
    select: { id: true, name: true },
  });
  if (!template) return mobileError("INVALID_REQUEST", "Jenis surat tidak tersedia.", 404);

  // Untuk siapa: diri sendiri, atau anggota KK bila pemohon kepala keluarga.
  let target = me;
  const forId = body?.forResidentId == null ? me.id : Number(body.forResidentId);
  if (forId !== me.id) {
    if (!canActForMember(me.familyRole) || !me.kk) {
      return mobileError("FORBIDDEN", "Hanya kepala keluarga yang bisa mengajukan atas nama anggota keluarga.", 403);
    }
    const member = await prisma.resident.findFirst({
      where: { id: forId, villageId: ctx.villageId, kk: me.kk, isAlive: true },
      select: { id: true, villageId: true, nik: true, kk: true, name: true, familyRole: true, birthDate: true, gender: true },
    });
    if (!member) return mobileError("INVALID_REQUEST", "Anggota keluarga tidak ditemukan.", 404);
    target = member;
  }

  const dup = await prisma.mailRequest.findFirst({
    where: { villageId: ctx.villageId, nik: target.nik, templateId: template.id, status: "pending" },
    select: { id: true },
  });
  if (dup) {
    return mobileError("INVALID_REQUEST", `Permohonan ${template.name} untuk ${target.name} masih diproses desa. Tunggu hasilnya dulu.`, 409, { existingId: Number(dup.id) });
  }

  const created = await prisma.mailRequest.create({
    data: {
      villageId: ctx.villageId,
      requestNumber: requestNumber(ctx.village.code),
      channel: "mobile",
      nik: target.nik,
      name: target.name,
      mailType: template.name,
      purpose,
      status: "pending",
      residentId: me.id,
      onBehalfResidentId: target.id === me.id ? null : target.id,
      templateId: template.id,
      formData: note ? { note } : undefined,
    },
  });
  void notifyVillageStaff(ctx.villageId, "mail", {
    type: "mail_status", title: "Permohonan surat baru", body: `${template.name} - ${target.name}`, deepLink: `/staff/surat/${Number(created.id)}`,
  });
  return NextResponse.json({ id: Number(created.id), number: created.requestNumber }, { status: 201 });
}
