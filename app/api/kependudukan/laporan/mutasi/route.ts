import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { netPopulationChange, summarizeByMonth, summarizeByRtRw, type MutationRow } from "@/lib/kependudukan/report";
import type { MutationType } from "@/lib/kependudukan/mutation";
import { MUTATION_LABEL } from "@/lib/kependudukan/mutation";
import { requireV2 } from "@/lib/kependudukan/api";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** Rekap mutasi penduduk yang sudah diterapkan: per bulan atau per RW/RT. `format=csv` untuk unduhan. */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { village } = guard.ctx;
    const off = requireV2(village);
    if (off) return off;

    const sp = req.nextUrl.searchParams;
    const year = new Date().getUTCFullYear();
    const from = YMD.test(sp.get("from") ?? "") ? sp.get("from")! : `${year}-01-01`;
    const to = YMD.test(sp.get("to") ?? "") ? sp.get("to")! : `${year}-12-31`;
    const group = sp.get("group") === "rtrw" ? "rtrw" : "month";

    const rows = await prisma.residentMutation.findMany({
      where: { villageId: village.id, status: "APPLIED", effectiveDate: { gte: new Date(`${from}T00:00:00.000Z`), lte: new Date(`${to}T00:00:00.000Z`) } },
      select: { type: true, effectiveDate: true, rw: true, rt: true },
    });
    const data: MutationRow[] = rows.map((r) => ({ type: r.type as MutationType, effectiveDate: r.effectiveDate.toISOString().slice(0, 10), rw: r.rw, rt: r.rt }));
    const summary = group === "rtrw" ? summarizeByRtRw(data, from, to) : summarizeByMonth(data, from, to);
    const lines = [...summary.entries()].map(([key, s]) => ({ key, ...s, net: netPopulationChange(s) }));

    if (sp.get("format") === "csv") {
      const head = [group === "rtrw" ? "Wilayah" : "Bulan", ...(Object.keys(MUTATION_LABEL) as MutationType[]).map((t) => MUTATION_LABEL[t]), "Selisih penduduk"];
      const csv = [head, ...lines.map((l) => [l.key, l.BIRTH, l.DEATH, l.MOVE_OUT, l.MOVE_IN, l.KK_CHANGE, l.net])]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
        .join("\r\n");
      return new NextResponse(`﻿${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="mutasi-penduduk-${from}-${to}.csv"` } });
    }
    return NextResponse.json({ from, to, group, lines });
  } catch (e) {
    console.error("GET /api/kependudukan/laporan/mutasi error:", e);
    return NextResponse.json({ error: "Gagal memuat laporan" }, { status: 500 });
  }
}
