import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-session";
import { getPlatformSession } from "@/lib/platform-session";
import { isPlatformAdminRole } from "@/lib/permissions";
import { freshPlatformSession } from "@/lib/auth/revalidate";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Pertahanan CSRF untuk mutasi `/api/admin/*` (autentikasi memakai cookie, jadi permintaan lintas situs/sub-domain akan
 * membawanya). Peramban modern selalu mengirim `Sec-Fetch-Site`: hanya "same-origin" (dan "none" = diketik langsung/alat)
 * yang boleh. Tanpa header itu (klien non-peramban, tes) dan bila `Origin` ada, host Origin harus sama dengan host permintaan.
 * Tidak ada header sama sekali = bukan permintaan lintas-situs dari peramban, jadi lolos.
 */
export function isCrossSiteMutation(req: Pick<NextRequest, "method" | "headers">): boolean {
  if (SAFE_METHODS.has(req.method.toUpperCase())) return false;
  const site = req.headers.get("sec-fetch-site");
  if (site) return site !== "same-origin" && site !== "none";
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(",")[0]!.trim().toLowerCase();
    return !host || new URL(origin).host.toLowerCase() !== host;
  } catch {
    return true;
  }
}

export async function requirePlatformSession(req: NextRequest) {
  if (isCrossSiteMutation(req)) {
    return { ok: false as const, response: NextResponse.json({ error: "Permintaan lintas situs ditolak." }, { status: 403 }) };
  }
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
