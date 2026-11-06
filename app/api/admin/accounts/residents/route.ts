import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { auditPlatform, auditPlatformStrict } from "@/lib/platform/audit";
import { parseResidentSearch } from "@/lib/platform/accounts/validate";
import { searchResidents } from "@/lib/platform/accounts/search";
import { NO_STORE, searchRateLimited } from "@/lib/platform/accounts/route-helpers";

/**
 * GET /api/admin/accounts/residents?q=&villageId= — cari warga lintas desa, BACA-SAJA. Nama awalan (min. 3 huruf) atau NIK tepat 16 digit; hasil tersamar.
 * Batas 60 pencarian/menit per admin. Setiap pencarian dicatat (`resident.search`: jenis, jumlah hasil, ada-tidaknya filter desa; TANPA kueri/NIK);
 * pencarian NIK persis memakai jejak ketat yang ditulis sebelum hasil dikirim.
 */
export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const limited = await searchRateLimited(auth.admin, "resident");
  if (limited) return limited;
  const parsed = parseResidentSearch(new URL(req.url).searchParams);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const residents = await searchResidents(prisma, parsed.value);

  const actor = { platformUserId: auth.admin.platformUserId, email: auth.admin.email };
  const entry = {
    action: "resident.search", targetType: "resident" as const,
    summary: parsed.value.mode === "nik" ? `Mencari warga dengan NIK persis (${residents.length} hasil)` : `Mencari warga berdasarkan nama (${residents.length} hasil)`,
    metadata: { mode: parsed.value.mode, results: residents.length, villageFiltered: parsed.value.villageId != null },
  };
  if (parsed.value.mode === "nik") {
    try {
      await auditPlatformStrict(req, actor, entry);
    } catch (err) {
      console.error("[admin/accounts] jejak pencarian NIK gagal:", err instanceof Error ? err.message : err);
      return NextResponse.json({ error: "Jejak audit gagal ditulis; hasil tidak ditampilkan." }, { status: 500 });
    }
  } else {
    await auditPlatform(req, actor, entry);
  }
  return NextResponse.json({ residents }, { headers: NO_STORE });
}
