import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { requireV2 } from "@/lib/kependudukan/api";
import { changeHead } from "@/lib/kependudukan/household-service";

/** Detail satu rumah tangga: anggota (tanpa NIK lengkap) dan riwayat mutasi KK ini. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { village } = guard.ctx;
    const off = requireV2(village);
    if (off) return off;

    const id = parseInt((await params).id, 10);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

    const h = await prisma.household.findFirst({
      where: { id, villageId: village.id },
      include: {
        members: { select: { id: true, name: true, nik: true, gender: true, familyRole: true, birthDate: true, isAlive: true, moveDate: true }, orderBy: { id: "asc" } },
        wilayahUnit: { select: { id: true, name: true, type: true } },
        dusunUnit: { select: { id: true, name: true } },
      },
    });
    if (!h) return NextResponse.json({ error: "Rumah tangga tidak ditemukan" }, { status: 404 });

    const mutations = await prisma.residentMutation.findMany({
      where: { villageId: village.id, householdKk: h.kkNumber },
      orderBy: [{ effectiveDate: "desc" }, { id: "desc" }],
      take: 20,
      select: { id: true, type: true, status: true, effectiveDate: true, residentName: true },
    });

    return NextResponse.json({
      id: h.id,
      kkNumber: h.kkNumber,
      status: h.status,
      address: h.address,
      rt: h.rt,
      rw: h.rw,
      hamlet: h.hamlet,
      wilayah: h.wilayahUnit,
      dusun: h.dusunUnit,
      headResidentId: h.headResidentId,
      members: h.members.map((m) => ({
        id: m.id,
        name: m.name,
        nikLast4: m.nik.slice(-4),
        gender: m.gender,
        familyRole: m.familyRole,
        birthDate: m.birthDate.toISOString().slice(0, 10),
        status: !m.isAlive ? "meninggal" : m.moveDate ? "pindah" : "aktif",
      })),
      mutations: mutations.map((m) => ({ id: String(m.id), type: m.type, status: m.status, effectiveDate: m.effectiveDate.toISOString().slice(0, 10), residentName: m.residentName })),
    });
  } catch (e) {
    console.error("GET /api/kependudukan/households/[id] error:", e);
    return NextResponse.json({ error: "Gagal memuat rumah tangga" }, { status: 500 });
  }
}

/** Ganti Kepala Keluarga: { headResidentId, otherHeadsRole? }. Kepala lama yang masih aktif wajib diberi hubungan baru. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const off = requireV2(ctx.village);
    if (off) return off;

    const id = parseInt((await params).id, 10);
    const body = await req.json().catch(() => null);
    const newHeadId = Number(body?.headResidentId);
    if (!Number.isInteger(id) || !Number.isInteger(newHeadId)) return NextResponse.json({ error: "Keluarga dan calon kepala wajib dipilih." }, { status: 400 });

    const result = await prisma.$transaction((tx) =>
      changeHead(tx, { villageId: ctx.village.id, householdId: id, newHeadId, otherHeadsRole: typeof body?.otherHeadsRole === "string" ? body.otherHeadsRole : undefined }),
    );
    if (!result.ok) return NextResponse.json({ error: result.errors[0], errors: result.errors }, { status: result.status });

    await auditWeb(req, ctx, "change_head", "households", id, { newHeadResidentId: newHeadId, residentsChanged: result.data.changed });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("PATCH /api/kependudukan/households/[id] error:", e);
    return NextResponse.json({ error: "Gagal mengganti Kepala Keluarga" }, { status: 500 });
  }
}
