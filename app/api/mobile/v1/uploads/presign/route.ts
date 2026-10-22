import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, type PutObjectCommandInput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mobileError, requireMobileContext } from "@/lib/mobile/context";
import { checkMobileRateLimit } from "@/lib/mobile/rate-limit";
import { MAX_PHOTO_BYTES, PHOTO_TYPES } from "@/lib/mobile/report-logic";
import { buildSpacesPublicUrl, getSpacesClient, getSpacesConfig } from "@/lib/spaces";

/** Presigned PUT untuk foto laporan warga (jpeg/png/webp, maks 2,5 MB). Foto sudah dikompres di HP. */
export async function POST(req: NextRequest) {
  const loaded = await requireMobileContext(req, { allow: ["citizen"] });
  if (!loaded.ok) return loaded.response;
  const { ctx } = loaded;

  const rl = checkMobileRateLimit(`presign:${ctx.accountId}`, { max: 30, windowMs: 10 * 60_000 });
  if (!rl.ok) return mobileError("RATE_LIMITED", "Terlalu banyak unggahan. Coba lagi sebentar.", 429, { retryAfterSec: rl.retryAfterSec });

  const body = (await req.json().catch(() => null)) as { contentType?: unknown; fileSize?: unknown; kind?: unknown } | null;
  const folder = body?.kind === "social" ? "mobile-social" : "mobile-reports";
  const contentType = typeof body?.contentType === "string" ? body.contentType : "";
  const size = Number(body?.fileSize);
  const ext = PHOTO_TYPES[contentType];
  if (!ext) return mobileError("INVALID_REQUEST", "Format foto harus JPG, PNG, atau WebP.", 400);
  if (!Number.isFinite(size) || size <= 0 || size > MAX_PHOTO_BYTES) {
    return mobileError("INVALID_REQUEST", "Ukuran foto terlalu besar. Maksimal 2,5 MB.", 400);
  }

  const now = new Date();
  const key = [
    "villages", ctx.village.code, folder, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"),
    `${globalThis.crypto.randomUUID()}.${ext}`,
  ].join("/");

  const cfg = getSpacesConfig();
  const aclOn = process.env.SPACES_USE_OBJECT_ACL !== "false";
  const input: PutObjectCommandInput = {
    Bucket: cfg.bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: size,
    ...(aclOn ? { ACL: (cfg.uploadAcl || "public-read") as "public-read" | "private" } : {}),
  };
  const uploadUrl = await getSignedUrl(getSpacesClient(), new PutObjectCommand(input), { expiresIn: 120 });
  const uploadHeaders: Record<string, string> = { "Content-Type": contentType };
  if (aclOn) uploadHeaders["x-amz-acl"] = input.ACL as string;

  return NextResponse.json({ uploadUrl, fileUrl: buildSpacesPublicUrl(key), uploadHeaders });
}
