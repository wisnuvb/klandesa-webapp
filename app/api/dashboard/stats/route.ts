import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { aggregateResidents } from "@/lib/dashboard/resident-stats";
import { getDataCompleteness } from "@/lib/dashboard/data-completeness";
import { getArchiveFilesBytes, getChargedMediaBytes, getEffectiveStorageLimitGb, getVillageStorageLimitBytes } from "@/lib/digitalArchive/quota";
import { summarizeStorage } from "@/lib/digitalArchive/quota-level";
import { createTtlCache } from "@/lib/cache/ttl-cache";

/**
 * Ringkasan desa sama untuk semua pengguna satu desa dan mahal dihitung (belasan query). Dibuka bersama oleh banyak
 * pengguna/tab, jadi cukup dihitung sekali per 30 detik per desa per proses; permintaan serentak berbagi satu hitungan.
 * Izin & langganan tetap diperiksa di SETIAP request (di luar cache). Angka bisa tertinggal maksimal 30 detik.
 */
const DASHBOARD_STATS_TTL_MS = 30_000;
const statsCache = createTtlCache<number, Record<string, unknown>>({ ttlMs: DASHBOARD_STATS_TTL_MS, maxEntries: 2000 });

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const payload = await statsCache.getOrLoad(village.id, async () => {
      const [{ residents, completeness }, totalOfficials, totalMailRequests, budgetSum] =
        await Promise.all([
          // Total warga dipakai ulang oleh checklist kelengkapan (tanpa COUNT(*) kedua atas tabel warga).
          aggregateResidents(village.id).then(async (residents) => ({
            residents,
            completeness: await getDataCompleteness(village, residents.total),
          })),
          prisma.official.count({ where: { villageId: village.id } }),
          prisma.mailRequest.count({ where: { villageId: village.id } }),
          prisma.budget.aggregate({
            where: { villageId: village.id, status: "active" },
            _sum: { remainingAmount: true },
          }),
        ]);

      // Peringatan kuota di dashboard tidak boleh menggagalkan kartu lain.
      const storage = await Promise.all([
        getArchiveFilesBytes(village.id),
        getChargedMediaBytes(village.id),
        getEffectiveStorageLimitGb(village),
      ])
        .then(([files, charged, limitGb]) => summarizeStorage(files, charged, getVillageStorageLimitBytes(limitGb)))
        .catch(() => null);

      return {
        storage,
        completeness,
        totals: {
          residents: residents.total,
          households: residents.households,
          officials: totalOfficials,
          mailServices: totalMailRequests,
          budgetAvailable: Number(budgetSum._sum.remainingAmount ?? 0),
        },
        charts: {
          gender: [
            { name: "Laki-laki", value: residents.male, color: "#0f766e" },
            { name: "Perempuan", value: residents.female, color: "#14b8a6" },
          ],
          age: residents.age,
          education: residents.education,
        },
        statusDesa: {
          sdgs: {
            dashboardUrl: "https://dashboard-sdgs.kemendesa.go.id/",
          },
        },
      };
    });
    return NextResponse.json(payload);
  } catch (err) {
    console.error("GET /api/dashboard/stats error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
