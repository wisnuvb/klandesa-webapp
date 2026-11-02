import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { currentMonthKey, isMonthKey, type LampidGroup } from "@/lib/kependudukan/lampid";
import { loadLampidReport } from "@/lib/kependudukan/lampid-service";

const SIGNER_POSITIONS = { kades: "Kepala Desa", sekdes: "Sekretaris Desa" } as const;

async function signerName(villageId: number, position: string): Promise<string> {
  const o = await prisma.official.findFirst({
    where: { villageId, status: "active", position: { name: { contains: position } } },
    orderBy: { startDate: "desc" },
    select: { name: true },
  });
  return o?.name ?? "";
}

/**
 * Laporan bulanan LAMPID (Lahir, Mati, Pindah, Datang): ringkasan awal/akhir bulan, rincian per wilayah, dan daftar nama.
 * `month=yyyy-mm` (bawaan bulan ini), `group=dusun|rtrw`. Hanya baca; memakai izin baca Data Warga.
 */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { village } = guard.ctx;

    const sp = req.nextUrl.searchParams;
    const now = new Date();
    const thisMonth = currentMonthKey(now);
    const monthParam = sp.get("month");
    if (monthParam !== null && !isMonthKey(monthParam)) return NextResponse.json({ error: "Bulan tidak valid. Gunakan format yyyy-mm." }, { status: 400 });
    const month = monthParam ?? thisMonth;
    if (month > thisMonth) return NextResponse.json({ error: "Bulan belum berjalan, laporan belum bisa disusun." }, { status: 400 });
    const group: LampidGroup = sp.get("group") === "rtrw" ? "rtrw" : "dusun";

    const [report, kades, sekdes] = await Promise.all([
      loadLampidReport(village.id, month, group),
      signerName(village.id, SIGNER_POSITIONS.kades),
      signerName(village.id, SIGNER_POSITIONS.sekdes),
    ]);

    return NextResponse.json({
      report,
      village: { name: village.name, district: village.district, regency: village.regency, province: village.province, address: village.address, logoUrl: village.logoUrl ?? null },
      signers: { kades, sekdes },
      generatedAt: now.toISOString(),
    });
  } catch (e) {
    console.error("GET /api/kependudukan/lampid error:", e);
    return NextResponse.json({ error: "Gagal menyusun laporan LAMPID" }, { status: 500 });
  }
}
