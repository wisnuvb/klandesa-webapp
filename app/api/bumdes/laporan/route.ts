import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, yearOf } from "@/lib/apbdes/http";
import { bumdesScope } from "@/lib/bumdes/api-context";
import { isPeriodKind } from "@/lib/bumdes/catalog";
import { reportCsv } from "@/lib/bumdes/export";
import { getReport } from "@/lib/bumdes/service";

/** Neraca dan laba rugi per unit usaha, Kantor Pusat, dan gabungan: ?year=&kind=S1|S2|TAHUN. Tambahkan format=csv&entity=gabungan|pusat|<unitId> untuk unduhan. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/bumdes/laporan", "Gagal menyusun laporan", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const s = await bumdesScope(guard.ctx);
    if (!s.ok) return s.response;
    const sp = req.nextUrl.searchParams;
    const kindRaw = sp.get("kind") ?? "TAHUN";
    if (!isPeriodKind(kindRaw)) return NextResponse.json({ error: "Jenis periode harus S1, S2, atau TAHUN." }, { status: 400 });
    const r = await getReport(prisma, s.bumdes.id, yearOf(sp.get("year")), kindRaw);
    if (!r.ok) return failResponse(r);
    if (sp.get("format") === "csv") {
      const ent = sp.get("entity") ?? "gabungan";
      const target = ent === "gabungan" ? r.data.consolidated : ent === "pusat" ? r.data.entities.find((e) => e.unitId === null) : r.data.entities.find((e) => String(e.unitId) === ent);
      if (!target) return NextResponse.json({ error: "Unit tidak ditemukan." }, { status: 404 });
      const csv = reportCsv(r.data, target);
      return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="laporan-bumdes-${r.data.year}-${r.data.kind}.csv"`, "Cache-Control": "no-store" } });
    }
    return NextResponse.json(r.data);
  });
}
