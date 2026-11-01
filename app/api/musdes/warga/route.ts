import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { attempt } from "@/lib/apbdes/http";

/**
 * Pencarian warga untuk memilih peserta/anggota tim (?q=). Hanya nama, jenis kelamin, dan RT/RW; tanpa NIK atau data
 * pribadi lain, karena pemakainya (perencanaan) tidak berhak membaca data kependudukan lengkap.
 */
export async function GET(req: NextRequest) {
  return attempt("GET /api/musdes/warga", "Gagal mencari warga", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const q = (req.nextUrl.searchParams.get("q") ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
    if (q.length < 2) return NextResponse.json({ residents: [] });
    const rows = await prisma.resident.findMany({
      where: { villageId: ctx.village.id, isAlive: true, moveDate: null, name: { contains: q } },
      select: { id: true, name: true, gender: true, rt: true, rw: true },
      orderBy: { name: "asc" },
      take: 20,
    });
    return NextResponse.json({ residents: rows.map((r) => ({ id: r.id, name: r.name, gender: r.gender === "Perempuan" ? "P" : r.gender === "Laki-laki" ? "L" : null, rt: r.rt, rw: r.rw })) });
  });
}
