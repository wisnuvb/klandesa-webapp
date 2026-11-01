import { NextRequest, NextResponse } from "next/server";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { getCitizenResident } from "@/lib/mobile/citizen-data";
import { auditAs } from "@/lib/mobile/audit-actor";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { setResidentPhoto } from "@/lib/residents/photo-server";

/** Pemilik akun mengganti foto profilnya sendiri. Diterapkan langsung (tanpa persetujuan), tercatat di audit. */
export async function PUT(req: NextRequest) {
  return save(req, true);
}

/** Hapus foto profil sendiri (kembali ke inisial nama). */
export async function DELETE(req: NextRequest) {
  return save(req, false);
}

async function save(req: NextRequest, set: boolean) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;
  const me = await getCitizenResident(ctx);
  if (!me) return mobileError("FORBIDDEN", "Akses ditolak.", 403);

  const rl = await checkRateLimitDb(limiterKey("profile-photo", ctx.accountId), { max: 20, windowMs: 10 * 60_000 });
  if (!rl.ok) return mobileError("RATE_LIMITED", "Terlalu banyak perubahan foto. Coba lagi nanti.", 429, { retryAfterSec: rl.retryAfterSec });

  let input: unknown = null;
  if (set) {
    const body = (await req.json().catch(() => null)) as { photoUrl?: unknown; thumbUrl?: unknown } | null;
    input = { photo: body?.photoUrl, photoThumb: body?.thumbUrl };
    if (body?.photoUrl == null || body?.thumbUrl == null) return mobileError("INVALID_REQUEST", "Foto tidak valid. Unggah ulang fotonya.", 400);
  }

  const r = await setResidentPhoto(ctx.village, me.id, input);
  if (!r.ok) return mobileError("INVALID_REQUEST", r.message, r.status);

  void auditAs(req, ctx.villageId, { type: "citizen", residentId: me.id }, r.photo ? "update_photo" : "remove_photo", "residents", me.id, { photo: { from: r.previous.photo, to: r.photo } });
  return NextResponse.json({ photoUrl: r.photoThumb || r.photo });
}
