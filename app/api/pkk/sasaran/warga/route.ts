import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { attempt } from "@/lib/apbdes/http";
import { isSubscriptionBlocked } from "@/lib/gizi/guard";
import { prisma } from "@/lib/prisma";
import { isSasaranGroup, parseSasaranStatus } from "@/lib/pkk/sasaran";
import { SASARAN_PAGE_MAX, SASARAN_PAGE_SIZE, sasaranList } from "@/lib/pkk/sasaran-data";

/**
 * Daftar nama di satu sel tabel sasaran: ?group=balita|prasekolah|sekolah|dewasa|lansia|ibuHamil|pus|wus|semua
 * dan ?area=<rw>|<rt> (kunci dari /api/pkk/sasaran; tanpa area = seluruh desa) dan ?status=aktif|pindah|semua. Tanpa NIK.
 * Dimuat bertahap: ?offset=<n>&limit=<1..100, bawaan 50>; jawaban memuat `nextOffset` (null bila habis).
 */
export async function GET(req: NextRequest) {
  return attempt("GET /api/pkk/sasaran/warga", "Gagal memuat daftar warga", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const blocked = isSubscriptionBlocked(guard.ctx.village);
    if (blocked) return blocked;

    const sp = req.nextUrl.searchParams;
    const group = sp.get("group") ?? "semua";
    if (group !== "semua" && !isSasaranGroup(group)) {
      return NextResponse.json({ error: "Kelompok sasaran tidak dikenal" }, { status: 400 });
    }
    const area = sp.get("area");
    if (area !== null && !/^[^|]{0,10}\|[^|]{0,10}$/.test(area)) {
      return NextResponse.json({ error: "Area tidak valid" }, { status: 400 });
    }
    const num = (k: string, def: number) => {
      const raw = sp.get(k);
      if (raw === null || raw === "") return def;
      return /^\d{1,7}$/.test(raw) ? Number(raw) : null;
    };
    const offset = num("offset", 0);
    const limit = num("limit", SASARAN_PAGE_SIZE);
    if (offset === null || limit === null || limit < 1 || limit > SASARAN_PAGE_MAX) {
      return NextResponse.json({ error: "offset/limit tidak valid" }, { status: 400 });
    }
    const status = parseSasaranStatus(sp.get("status"));
    if (!status) return NextResponse.json({ error: "Status warga tidak dikenal" }, { status: 400 });
    return NextResponse.json(await sasaranList(prisma, guard.ctx.village.id, group, area, status, { offset, limit }), { headers: { "Cache-Control": "no-store" } });
  });
}
