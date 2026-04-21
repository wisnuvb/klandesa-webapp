import { getApiSession } from "@/lib/api-session";
import { NextRequest, NextResponse } from "next/server";
import { resolveVillage } from "@/lib/village";
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
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const village = await resolveVillage({ req, session });

    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
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
