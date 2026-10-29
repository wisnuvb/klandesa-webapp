import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, type PutObjectCommandInput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { checkMobileRateLimit, checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { MAX_PHOTO_BYTES, PHOTO_TYPES } from "@/lib/mobile/report-logic";
import { buildSpacesPublicUrl, getSpacesClient, getSpacesConfig } from "@/lib/spaces";
import { MOBILE_MEDIA_QUOTA_BYTES, mediaQuotaFullMessage } from "@/lib/mobile/media-quota";
import { releaseMobileMedia, reserveMobileMedia } from "@/lib/mobile/media-usage";

/** Presigned PUT untuk foto laporan warga dan postingan Warga (jpeg/png/webp, maks 2,5 MB). Foto sudah dikompres di HP. Perangkat desa hanya boleh untuk postingan Warga dan bukti iuran/kas. */
export async function POST(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["citizen", "staff"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;

  const rl = checkMobileRateLimit(`presign:${ctx.accountType}:${ctx.accountId}`, { max: 30, windowMs: 10 * 60_000 });
  if (!rl.ok) return mobileError("RATE_LIMITED", "Terlalu banyak unggahan. Coba lagi sebentar.", 429, { retryAfterSec: rl.retryAfterSec });

  // Kuota harian bersama lintas worker: cegah akun dipakai menghabiskan penyimpanan (maks 40 foto/hari ≈ 100 MB).
  const daily = await checkRateLimitDb(limiterKey("presign-day", ctx.accountType, ctx.accountId), { max: 40, windowMs: 24 * 3600_000 });
  if (!daily.ok) return mobileError("RATE_LIMITED", "Batas unggah foto hari ini tercapai. Coba lagi besok.", 429, { retryAfterSec: daily.retryAfterSec });

  const body = (await req.json().catch(() => null)) as { contentType?: unknown; fileSize?: unknown; kind?: unknown } | null;
  if (ctx.accountType === "staff" && body?.kind !== "social" && body?.kind !== "fee") return mobileError("FORBIDDEN", "Anda tidak punya akses ke fitur ini.", 403);
  const folder = body?.kind === "social" ? "mobile-social" : body?.kind === "fee" ? "mobile-fees" : "mobile-reports";
  const contentType = typeof body?.contentType === "string" ? body.contentType : "";
  const size = Number(body?.fileSize);
  const ext = PHOTO_TYPES[contentType];
  if (!ext) return mobileError("INVALID_REQUEST", "Format foto harus JPG, PNG, atau WebP.", 400);
  if (!Number.isFinite(size) || size <= 0 || size > MAX_PHOTO_BYTES) {
    return mobileError("INVALID_REQUEST", "Ukuran foto terlalu besar. Maksimal 2,5 MB.", 400);
  }

  // Kuota foto per desa (pengaman biaya penyimpanan), dibaca dari penghitung di database, bukan dari bucket.
  // Gagal terbuka: bila penghitung tidak bisa dipakai, unggahan tetap jalan.
  const cfg = getSpacesConfig();
  let reserved = false;
  try {
    if (!(await reserveMobileMedia(ctx.village, cfg.bucket, size, MOBILE_MEDIA_QUOTA_BYTES))) {
      return mobileError("FORBIDDEN", mediaQuotaFullMessage(), 403, { reason: "MEDIA_QUOTA_FULL" });
    }
    reserved = true;
  } catch (e) {
    console.error("[mobile presign] gagal memeriksa kuota foto", e);
  }

  const now = new Date();
  const key = [
    "villages", ctx.village.code, folder, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"),
    `${globalThis.crypto.randomUUID()}.${ext}`,
  ].join("/");

  const aclOn = process.env.SPACES_USE_OBJECT_ACL !== "false";
  const input: PutObjectCommandInput = {
    Bucket: cfg.bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: size,
    ...(aclOn ? { ACL: (cfg.uploadAcl || "public-read") as "public-read" | "private" } : {}),
  };
  let uploadUrl: string;
  try {
    uploadUrl = await getSignedUrl(getSpacesClient(), new PutObjectCommand(input), { expiresIn: 120 });
  } catch (e) {
    if (reserved) await releaseMobileMedia(ctx.village.id, size).catch(() => undefined);
    throw e;
  }
  const uploadHeaders: Record<string, string> = { "Content-Type": contentType };
  if (aclOn) uploadHeaders["x-amz-acl"] = input.ACL as string;

  return NextResponse.json({ uploadUrl, fileUrl: buildSpacesPublicUrl(key), uploadHeaders });
}
