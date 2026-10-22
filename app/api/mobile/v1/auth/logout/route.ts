import { NextRequest, NextResponse } from "next/server";
import { revokeMobileSession } from "@/lib/mobile/sessions";

/** Idempotent: selalu 204 agar klien bisa membersihkan sesi lokal meski token sudah tak valid. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { refreshToken?: unknown } | null;
  if (typeof body?.refreshToken === "string" && body.refreshToken.length <= 200) {
    await revokeMobileSession(body.refreshToken);
  }
  return new NextResponse(null, { status: 204 });
}
