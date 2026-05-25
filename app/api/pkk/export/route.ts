import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { computePkkStats } from "@/lib/pkk/stats";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";

function csvEscape(v: string | number | null | undefined): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const format = req.nextUrl.searchParams.get("format") ?? "csv";

    const [stats, dasawisma, sessions, visits] = await Promise.all([
      computePkkStats(village.id),
      prisma.dasawisma.findMany({
        where: { villageId: village.id },
        orderBy: [{ rw: "asc" }, { rt: "asc" }],
      }),
      prisma.posyanduSession.findMany({
        where: { villageId: village.id },
        orderBy: [{ sessionDate: "desc" }],
        take: 500,
      }),
      prisma.posyanduVisit.findMany({
        where: { session: { villageId: village.id } },
        include: {
          resident: { select: { name: true, nik: true } },
          session: { select: { sessionDate: true, location: true } },
        },
        orderBy: [{ createdAt: "desc" }],
        take: 1000,
      }),
    ]);

    if (format === "json") {
      return NextResponse.json({ stats, dasawisma, sessions, visits });
    }

    const lines: string[] = [];
    lines.push("LAPORAN PKK & DASAWISMA");
    lines.push(`Desa ID,${village.id}`);
    lines.push(`Tanggal export,${new Date().toISOString().slice(0, 10)}`);
    lines.push("");
    lines.push("RINGKASAN");
    lines.push(`Balita stunting,${stats.balitaStunting}`);
    lines.push(`Ibu hamil,${stats.ibuHamil}`);
    lines.push(`Dasawisma,${stats.dasawismaCount}`);
    lines.push(`Sesi posyandu bulan ini,${stats.posyanduSessionsThisMonth}`);
    lines.push("");
    lines.push("DASAWISMA");
    lines.push("RT,RW,Ketua,Anggota");
    for (const d of dasawisma) {
      lines.push(
        [csvEscape(d.rt), csvEscape(d.rw), csvEscape(d.leaderName), d.memberCount].join(","),
      );
    }
    lines.push("");
    lines.push("KUNJUNGAN POSYANDU");
    lines.push("Tanggal Sesi,Lokasi,Nama Warga,NIK,Berat kg,Tinggi cm,Stunting");
    for (const v of visits) {
      lines.push(
        [
          csvEscape(v.session.sessionDate.toISOString().slice(0, 10)),
          csvEscape(v.session.location),
          csvEscape(v.resident.name),
          csvEscape(v.resident.nik),
          v.weightKg ?? "",
          v.heightCm ?? "",
          v.isStunting ? "Ya" : "Tidak",
        ].join(","),
      );
    }

    const csv = lines.join("\n");
    const filename = `laporan-pkk-${village.code}-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("GET /api/pkk/export", e);
    return NextResponse.json({ error: "Gagal export" }, { status: 500 });
  }
}
