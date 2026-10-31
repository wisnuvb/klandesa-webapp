import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { requireV2 } from "@/lib/kependudukan/api";

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
