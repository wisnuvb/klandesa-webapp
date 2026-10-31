import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { requireV2 } from "@/lib/kependudukan/api";

/** Master wilayah desa: dusun (datar) dan RW → RT, dengan jumlah warga & rumah tangga. Dusun dan RW saling silang. */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { village } = guard.ctx;
    const off = requireV2(village);
    if (off) return off;

    const units = await prisma.wilayahUnit.findMany({
      where: { villageId: village.id, isActive: true },
      select: { id: true, type: true, name: true, parentId: true, _count: { select: { areaResidents: true, dusunResidents: true, areaHouseholds: true, dusunHouseholds: true } } },
    });
    const natural = (a: string, b: string) => a.localeCompare(b, "id", { numeric: true });
    const node = (u: (typeof units)[number]) => ({
      id: u.id,
      name: u.name,
      residents: u.type === "dusun" ? u._count.dusunResidents : u._count.areaResidents,
      households: u.type === "dusun" ? u._count.dusunHouseholds : u._count.areaHouseholds,
    });
    const rts = units.filter((u) => u.type === "rt");
    const rwOf = (rw: (typeof units)[number]) => ({
      ...node(rw),
      rt: rts.filter((r) => r.parentId === rw.id).sort((a, b) => natural(a.name, b.name)).map(node),
    });
    return NextResponse.json({
      dusun: units.filter((u) => u.type === "dusun").sort((a, b) => natural(a.name, b.name)).map(node),
      rw: units.filter((u) => u.type === "rw").sort((a, b) => natural(a.name, b.name)).map(rwOf),
      rtTanpaRw: rts.filter((r) => r.parentId == null).sort((a, b) => natural(a.name, b.name)).map(node),
    });
  } catch (e) {
    console.error("GET /api/kependudukan/wilayah error:", e);
    return NextResponse.json({ error: "Gagal memuat wilayah" }, { status: 500 });
  }
}
