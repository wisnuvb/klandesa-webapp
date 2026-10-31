import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import type { WorkKind } from "@/lib/kependudukan/worklist";
import { buildKualitasResponse, KUALITAS_MAX_LIMIT } from "@/lib/kependudukan/worklist-view";

const KINDS: readonly WorkKind[] = ["INVALID_KK", "MISSING_KK", "UNKNOWN_ROLE", "MULTIPLE_HEADS", "NO_HEAD", "HEAD_NOT_ACTIVE", "SPLIT_ACROSS_RT"];

/**
 * Daftar kerja perbaikan data KK (baca-saja). Saran bersifat usulan; penerapan lewat PATCH /api/residents/[id].
 * Tidak mengirim NIK; nama dikirim karena operator memerlukannya untuk mengenali warga.
 */
export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) return subscriptionBlockedResponse(village);

    const sp = req.nextUrl.searchParams;
    const kindParam = sp.get("kind");
    const kind = KINDS.find((k) => k === kindParam);
    // `confidence=TINGGI`: hanya temuan yang saran terbaiknya yakin dan dapat diterapkan (dasar tombol massal).
    const onlyConfident = sp.get("confidence") === "TINGGI";
    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
    const limit = Math.min(KUALITAS_MAX_LIMIT, Math.max(1, parseInt(sp.get("limit") ?? "20", 10) || 20));

    const rows = await prisma.resident.findMany({
      where: { villageId: village.id },
      select: {
        id: true, nik: true, name: true, gender: true, kk: true, familyRole: true, isAlive: true, moveDate: true,
        rt: true, rw: true, hamlet: true, address: true, birthDate: true, fatherNik: true, fatherName: true, motherNik: true, motherName: true,
      },
    });

    return NextResponse.json(buildKualitasResponse(rows, { kind, onlyConfident, page, limit }));
  } catch (e) {
    console.error("GET /api/kependudukan/kualitas error:", e);
    return NextResponse.json({ error: "Gagal memuat daftar perbaikan data" }, { status: 500 });
  }
}
