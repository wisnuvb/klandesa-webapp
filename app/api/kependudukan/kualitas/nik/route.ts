import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { createTtlCache } from "@/lib/cache/ttl-cache";
import { buildNikReport, NIK_ISSUE_META, NIK_ISSUE_ORDER, type NikIssueKind } from "@/lib/kependudukan/nik-quality";

const MAX_LIMIT = 100;

const ROW_SELECT = { id: true, nik: true, name: true, birthDate: true, gender: true, rt: true, rw: true, isAlive: true, moveDate: true } as const;

/** Ringkasan hitungan (`?summary=1`) di-cache 1 menit per desa: menghitungnya memuat semua warga. Daftar temuan tetap segar. */
const summaryCache = createTtlCache<number, { total: number; counts: ReturnType<typeof buildNikReport>["counts"] }>({ ttlMs: 60_000, maxEntries: 1000 });

/**
 * Temuan kualitas NIK (baca-saja): format, kode provinsi, tanggal di dalam NIK, kecocokan dengan tanggal lahir dan jenis kelamin,
 * serta kemungkinan warga ganda. Hanya 4 digit terakhir NIK yang dikirim. Tidak mengubah data apa pun.
 */
export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);

    const sp = req.nextUrl.searchParams;
    if (sp.get("summary") === "1") {
      const payload = await summaryCache.getOrLoad(village.id, async () => {
        const report = buildNikReport(await prisma.resident.findMany({ where: { villageId: village.id }, select: ROW_SELECT }));
        return { total: report.total, counts: report.counts };
      });
      return NextResponse.json(payload);
    }
    const kind = NIK_ISSUE_ORDER.find((k) => k === sp.get("kind")) as NikIssueKind | undefined;
    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(sp.get("limit") ?? "25", 10) || 25));

    const rows = await prisma.resident.findMany({ where: { villageId: village.id }, select: ROW_SELECT });
    const report = buildNikReport(rows);
    const shown = kind ? report.findings.filter((f) => f.kind === kind) : report.findings;
    const start = (page - 1) * limit;
    return NextResponse.json({
      total: report.total,
      counts: report.counts,
      kinds: NIK_ISSUE_ORDER.map((k) => ({ id: k, ...NIK_ISSUE_META[k] })),
      page,
      limit,
      matching: shown.length,
      findings: shown.slice(start, start + limit),
    });
  } catch (e) {
    console.error("GET /api/kependudukan/kualitas/nik error:", e);
    return NextResponse.json({ error: "Gagal memeriksa NIK" }, { status: 500 });
  }
}
