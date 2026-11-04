import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { isKependudukanV2 } from "@/lib/kependudukan/sync";
import { resolveKkKey } from "@/lib/kependudukan/kk-list-service";

/**
 * Riwayat Buku Mutasi satu KK (30 terbaru): kejadian yang tercatat atas KK ini atau atas salah satu anggotanya.
 * Hanya jenis, status, tanggal, dan nama; tanpa NIK dan tanpa isi rinci. Buku Mutasi hanya terisi di desa Kependudukan v2.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ kk: string }> }) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);

    const kk = await resolveKkKey(prisma, village.id, (await ctx.params).kk);
    if (!kk) return NextResponse.json({ error: "KK tidak ditemukan" }, { status: 404 });

    const members = await prisma.resident.findMany({ where: { villageId: village.id, kk }, select: { id: true } });
    if (members.length === 0) return NextResponse.json({ error: "KK tidak ditemukan" }, { status: 404 });

    const rows = await prisma.residentMutation.findMany({
      where: { villageId: village.id, OR: [{ householdKk: kk }, { residentId: { in: members.map((m) => m.id) } }] },
      orderBy: [{ effectiveDate: "desc" }, { id: "desc" }],
      take: 30,
      select: { id: true, type: true, status: true, effectiveDate: true, residentName: true },
    });

    return NextResponse.json(
      {
        enabled: isKependudukanV2(village.settings),
        items: rows.map((m) => ({
          id: String(m.id),
          type: m.type,
          status: m.status,
          effectiveDate: m.effectiveDate.toISOString().slice(0, 10),
          residentName: m.residentName,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("GET /api/kk/[kk]/riwayat error:", err);
    return NextResponse.json({ error: "Gagal memuat riwayat" }, { status: 500 });
  }
}
