import { requireVillageApiContext } from "@/lib/api-village-context";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditWeb } from "@/lib/audit/web-audit";
import { canVillageUser } from "@/lib/permissions/can";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { parseKkQuery, toKkListRow } from "@/lib/kependudukan/kk-list";
import { listKk } from "@/lib/kependudukan/kk-list-service";

/**
 * Daftar KK satu halaman. Satu agregasi SQL (bukan query per KK); hanya anggota aktif yang dihitung.
 * Nomor KK dikirim tersamar plus `ref` (pegangan buram untuk membuka detail). Nomor lengkap hanya untuk pemegang izin
 * `residents.export` (admin) yang memintanya dengan `?full=1`, dan setiap permintaan dicatat di jejak audit.
 */
export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, userId, session } = loaded.ctx;

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const query = parseKkQuery(req.nextUrl.searchParams);
    const canFull = canVillageUser(session, "residents", "export");
    if (query.full && !canFull) {
      return NextResponse.json({ error: "Hanya admin yang boleh melihat nomor KK lengkap." }, { status: 403 });
    }

    const { rows, total } = await listKk(prisma, { villageId: village.id, query });
    const out = rows.map((r) => toKkListRow(r, { full: query.full }));

    if (query.full && out.length > 0) {
      await auditWeb(req, { userId, village }, "reveal", "kk_list", `halaman-${query.page}`, { rows: out.length });
    }

    return NextResponse.json({ rows: out, total, canFull }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/kk error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
