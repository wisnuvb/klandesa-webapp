import { NextRequest, NextResponse } from "next/server";
import {
  aggregateRegionalAdoption,
  aggregateRegionalDemographics,
  aggregateRegionalFinance,
  aggregateRegionalSdgs,
  aggregateRegionalServices,
} from "@/lib/regional-aggregate";
import { requireRegionalApi } from "@/lib/regional-api-handler";

export const dynamic = "force-dynamic";

function toCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(","),
    )
    .join("\n");
}

export async function GET(req: NextRequest) {
  const loaded = await requireRegionalApi(req, "regional_export_get");
  if (!loaded.ok) return loaded.response;
  const { regional, villageIds, villages, req: request } = loaded.ctx;

  const format = request.nextUrl.searchParams.get("format") ?? "json";
  const year = new Date().getFullYear();

  const [demographics, sdgs, adoption, finance, services] = await Promise.all([
    aggregateRegionalDemographics(regional.scope, villageIds),
    aggregateRegionalSdgs(regional.scope, villageIds, villages),
    aggregateRegionalAdoption(regional.scope, villageIds, villages),
    aggregateRegionalFinance(regional.scope, villageIds, villages, year),
    aggregateRegionalServices(regional.scope, villageIds, villages),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    scope: regional.scope,
    demographics,
    sdgs,
    adoption,
    finance,
    services,
  };

  if (format === "csv") {
    const rows: string[][] = [
      ["Bagian", "Metrik", "Nilai"],
      ["Demografi", "Total penduduk", String(demographics.totalResidents)],
      ["Demografi", "Stunting (%)", String(demographics.stuntingRate ?? "")],
      ["Demografi", "Desil 1-2 (%)", String(demographics.desil12Rate ?? "")],
      ["SDGs", "Skor rata-rata", String(sdgs.overallScore ?? "")],
      ["Adopsi", "Desa berlangganan", String(adoption.subscribedVillages)],
      ["Keuangan", "Anggaran total", String(finance.totals.budgetAmount)],
      ["Keuangan", "Realisasi (%)", String(finance.totals.realizationPct)],
      ["Layanan", "Surat terbit", String(services.mail.totalServices)],
      ["Layanan", "Pengaduan terbuka", String(services.citizenReports.open)],
    ];
    for (const v of adoption.villages) {
      rows.push([
        "Desa",
        v.name,
        `modul=${v.modulesUsed}; langganan=${v.subscriptionActive}`,
      ]);
    }
    const csv = toCsv(rows);
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan_wilayah_${stamp}.csv"`,
      },
    });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return NextResponse.json(payload, {
    headers: {
      "Content-Disposition": `attachment; filename="laporan_wilayah_${stamp}.json"`,
    },
  });
}
