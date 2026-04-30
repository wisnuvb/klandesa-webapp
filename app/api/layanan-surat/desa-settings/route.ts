import { requireVillageApiContext } from "@/lib/api-village-context";
import { NextRequest, NextResponse } from "next/server";
import {
  buildLetterFormSnapshot,
  snapshotToDesaSettings,
} from "@/lib/mail/letterFormSnapshot";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

/**
 * GET — pengaturan desa + snapshot variabel surat untuk UI Layanan Surat
 * (tanpa hardcode; data dari Village + Official + Village.settings).
 */
export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const snapshot = await buildLetterFormSnapshot(village.id);
    const settings = snapshotToDesaSettings(village, snapshot);

    return NextResponse.json(settings);
  } catch (err) {
    console.error("GET /api/layanan-surat/desa-settings error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
