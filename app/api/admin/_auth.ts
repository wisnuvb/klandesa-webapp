import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-session";
import { getPlatformSession } from "@/lib/platform-session";

export async function requirePlatformSession(req: NextRequest) {
  const session = await getApiSession(req);
  const admin = getPlatformSession(session);
  if (!admin) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true as const, admin };
}
