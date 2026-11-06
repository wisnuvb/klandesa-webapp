import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { auditPlatformStrict } from "@/lib/platform/audit";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { NO_STORE, readRiskyBody } from "@/lib/platform/accounts/route-helpers";
import { parseId } from "@/lib/platform/accounts/validate";

/**
 * POST /api/admin/accounts/residents/[id]/reveal — tampilkan NIK & telepon utuh satu warga.
 * Step-up + alasan + jejak ketat `resident.view_sensitive` (jejak ditulis SEBELUM data dikirim; isinya tanpa NIK).
 * Batas 20 pembukaan / 10 menit per admin.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const id = parseId((await ctx.params).id);
  if (id == null) return NextResponse.json({ error: "ID warga tidak valid." }, { status: 400 });

  const input = await readRiskyBody(req, auth.admin);
  if (!input.ok) return input.response;

  const rl = await checkRateLimitDb(limiterKey("admin-resident-reveal", auth.admin.platformUserId), { max: 20, windowMs: 10 * 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak pembukaan data lengkap. Coba lagi nanti.", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const r = await prisma.resident.findUnique({ where: { id }, select: { id: true, villageId: true, name: true, nik: true, phone: true } });
  if (!r) return NextResponse.json({ error: "Warga tidak ditemukan." }, { status: 404 });

  try {
    await auditPlatformStrict(req, { platformUserId: auth.admin.platformUserId, email: auth.admin.email }, {
      action: "resident.view_sensitive", targetType: "resident", targetId: r.id, villageId: r.villageId,
      summary: `Membuka NIK dan telepon lengkap warga #${r.id}`,
      metadata: { reason: input.reason, fields: ["nik", "phone"] },
    });
  } catch (err) {
    console.error("[admin/accounts] jejak reveal gagal:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Jejak audit gagal ditulis; data tidak ditampilkan." }, { status: 500 });
  }
  return NextResponse.json({ resident: { id: r.id, name: r.name, nik: r.nik, phone: r.phone } }, { headers: NO_STORE });
}
