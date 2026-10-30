import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { toUserFacingError } from "@/lib/billing/user-error";
import { getAdminDisabledChannels } from "@/lib/payment/channel-settings";
import { listLinkquPaymentOptions } from "@/lib/payment/linkqu-channels";

export const dynamic = "force-dynamic";

/**
 * Metode & kanal pembayaran LinkQu beserta ketersediaannya untuk nominal tertentu (`?amount=`).
 * Dipakai dialog pembayaran supaya pengguna hanya bisa memilih yang sedang tersedia. Server tetap memeriksa ulang saat checkout.
 */
export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const raw = req.nextUrl.searchParams.get("amount");
    const amount = raw != null && raw !== "" && Number.isFinite(Number(raw)) ? Number(raw) : undefined;

    return NextResponse.json(listLinkquPaymentOptions(amount, await getAdminDisabledChannels()), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const friendly = toUserFacingError(error, "GET /api/billing/payment-options");
    return NextResponse.json({ error: friendly.message }, { status: friendly.status });
  }
}
