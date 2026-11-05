import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-session";
import { getPlatformSession } from "@/lib/platform-session";
import { isPlatformAdminRole } from "@/lib/permissions";
import { freshPlatformSession } from "@/lib/auth/revalidate";

export async function requirePlatformSession(req: NextRequest) {
  const session = await getApiSession(req);
  const parsed = getPlatformSession(session);
  // Akun & role dibaca ulang dari DB: admin platform yang dinonaktifkan/diturunkan tidak boleh tetap berhak sampai JWT (30 hari) habis.
  const admin = parsed ? await freshPlatformSession(parsed) : null;
  if (!admin) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!isPlatformAdminRole(admin.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true as const, admin };
}
