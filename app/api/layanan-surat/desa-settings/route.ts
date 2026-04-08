import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { resolveVillage } from "@/lib/village";
import {
  buildLetterFormSnapshot,
  snapshotToDesaSettings,
} from "@/lib/mail/letterFormSnapshot";

/**
 * GET — pengaturan desa + snapshot variabel surat untuk UI Layanan Surat
 * (tanpa hardcode; data dari Village + Official + Village.settings).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const village = await resolveVillage({ req, session });

    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
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
