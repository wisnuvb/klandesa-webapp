import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { auditPlatform } from "@/lib/platform/audit";
import { parseAccountSearch } from "@/lib/platform/accounts/validate";
import { isFullEmail, searchAccounts } from "@/lib/platform/accounts/search";
import { NO_STORE, searchRateLimited } from "@/lib/platform/accounts/route-helpers";

/**
 * GET /api/admin/accounts?q=&type=staff|citizen|all&villageId=&status=active|inactive|pending|locked&page= — pencarian akun lintas desa (tersamar, 25/halaman).
 * Email asli hanya dicocokkan PERSIS (alamat lengkap); awalan hanya untuk nama/username/desa. Batas 60 pencarian/menit per admin.
 * Pencarian dengan alamat email lengkap dicatat (`account.search`: jenis & jumlah hasil, tanpa kueri).
 */
export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const limited = await searchRateLimited(auth.admin, "account");
  if (limited) return limited;
  const parsed = parseAccountSearch(new URL(req.url).searchParams);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const result = await searchAccounts(prisma, parsed.value);
  if (isFullEmail(parsed.value.q)) {
    await auditPlatform(req, { platformUserId: auth.admin.platformUserId, email: auth.admin.email }, {
      action: "account.search", targetType: "user",
      summary: `Mencari akun dengan alamat email lengkap (${result.total} hasil)`,
      metadata: { mode: "email_exact", results: result.total, villageFiltered: parsed.value.villageId != null },
    });
  }
  return NextResponse.json(result, { headers: NO_STORE });
}
