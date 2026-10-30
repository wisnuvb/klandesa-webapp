import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { checkSubdomainAvailability } from "@/lib/domain/service";

/** Cek ketersediaan alamat subdomain (dipakai wizard checkout sebelum pembayaran). */
export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const label = req.nextUrl.searchParams.get("label") ?? "";
    const result = await checkSubdomainAvailability(label, loaded.ctx.village.id);
    if (!result.ok) {
      return NextResponse.json({ available: false, error: result.error });
    }
    return NextResponse.json({ available: true, hostname: result.hostname });
  } catch (e) {
    console.error("GET /api/website/domains/check error:", e);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
