import { NextResponse } from "next/server";
import { getAppBuildId } from "@/lib/build-id";

// Sengaja tanpa auth(): hanya mengembalikan build ID (bukan data sensitif),
// jadi tidak perlu overhead decode sesi/JWT untuk endpoint yang di-poll berkala ini.
export async function GET() {
  return NextResponse.json(
    { buildId: getAppBuildId() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
