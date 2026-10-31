import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { activateVillage, isKependudukanV2 } from "@/lib/kependudukan/sync";

/**
 * Aktifkan fitur Keluarga, Wilayah, dan Buku Mutasi untuk desa ini dengan satu klik (khusus admin desa).
 * Membentuk struktur dari data warga yang ada, lalu menyalakan fitur. Data warga tidak diubah. Aman diulang.
 */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!isVillageSubscriptionActive(ctx.village)) return subscriptionBlockedResponse(ctx.village);
    if (ctx.dbUser.role !== "admin") {
      return NextResponse.json({ error: "Hanya admin desa yang dapat mengaktifkan fitur ini." }, { status: 403 });
    }

    const already = isKependudukanV2(ctx.village.settings);
    const summary = await activateVillage(ctx.village.id);
    await auditWeb(req, ctx, "activate", "kependudukan_v2", ctx.village.id, { households: summary.households, units: summary.units, alreadyActive: already });
    return NextResponse.json({ success: true, households: summary.households, wilayahUnits: summary.units, householdsWithoutHead: summary.withoutHead });
  } catch (e) {
    console.error("POST /api/kependudukan/aktivasi error:", e);
    const busy = e instanceof Error && /sedang berjalan/.test(e.message);
    return NextResponse.json({ error: busy ? "Aktivasi sedang berjalan. Tunggu sebentar." : "Gagal mengaktifkan fitur. Coba lagi." }, { status: busy ? 409 : 500 });
  }
}
