import { PutObjectCommand, type PutObjectCommandInput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/prisma";
import { MAX_PHOTO_BYTES, PHOTO_TYPES } from "@/lib/mobile/report-logic";
import { MOBILE_MEDIA_QUOTA_BYTES, mediaQuotaFullMessage } from "@/lib/mobile/media-quota";
import { releaseMobileMedia, reserveMobileMedia } from "@/lib/mobile/media-usage";
import { deleteMobilePhotos } from "@/lib/mobile/storage";
import { buildSpacesPublicUrl, getSpacesClient, getSpacesConfig } from "@/lib/spaces";
import { parsePhotoPair, residentPhotoKey, RESIDENT_PHOTO_FOLDER, type PhotoPairResult } from "./photo";

type Village = { id: number; code: string };

export type PresignResult =
  | { ok: true; uploadUrl: string; fileUrl: string; uploadHeaders: Record<string, string> }
  | { ok: false; status: number; message: string; reason?: string };

/** Presigned PUT untuk satu berkas foto profil warga (jpeg/png/webp, maks 2,5 MB). Dipakai web (staf) dan mobile (pemilik akun). */
export async function presignResidentPhoto(village: Village, residentId: number, contentType: unknown, fileSize: unknown): Promise<PresignResult> {
  const ext = typeof contentType === "string" ? PHOTO_TYPES[contentType] : undefined;
  if (!ext || typeof contentType !== "string") return { ok: false, status: 400, message: "Format foto harus JPG, PNG, atau WebP." };
  const size = Number(fileSize);
  if (!Number.isFinite(size) || size <= 0 || size > MAX_PHOTO_BYTES) return { ok: false, status: 400, message: "Ukuran foto terlalu besar. Maksimal 2,5 MB." };

  // Kuota foto per desa; gagal terbuka bila penghitung tidak bisa dipakai (sama dengan unggahan mobile lain).
  const cfg = getSpacesConfig();
  let reserved = false;
  try {
    if (!(await reserveMobileMedia(village, cfg.bucket, size, MOBILE_MEDIA_QUOTA_BYTES))) {
      return { ok: false, status: 403, message: mediaQuotaFullMessage(), reason: "MEDIA_QUOTA_FULL" };
    }
    reserved = true;
  } catch (e) {
    console.error("[resident photo] gagal memeriksa kuota foto", e);
  }

  const key = residentPhotoKey(village.code, residentId, globalThis.crypto.randomUUID(), ext);
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
    if (reserved) await releaseMobileMedia(village.id, size).catch(() => undefined);
    throw e;
  }
  const uploadHeaders: Record<string, string> = { "Content-Type": contentType };
  if (aclOn) uploadHeaders["x-amz-acl"] = input.ACL as string;
  return { ok: true, uploadUrl, fileUrl: buildSpacesPublicUrl(key), uploadHeaders };
}

export type SetPhotoResult =
  | { ok: true; photo: string | null; photoThumb: string | null; previous: { photo: string | null; photoThumb: string | null } }
  | { ok: false; status: 400 | 404; message: string };

/**
 * Simpan (atau hapus bila keduanya null) foto warga. URL divalidasi sebagai milik warga ini;
 * berkas lama dihapus dari penyimpanan setelah database diperbarui (best-effort).
 */
export async function setResidentPhoto(village: Village, residentId: number, body: unknown): Promise<SetPhotoResult> {
  const parsed: PhotoPairResult = parsePhotoPair(body, getSpacesConfig().cdnBaseUrl, village.code, residentId);
  if (!parsed.ok) return { ok: false, status: 400, message: parsed.message };

  const existing = await prisma.resident.findFirst({ where: { id: residentId, villageId: village.id }, select: { photo: true, photoThumb: true } });
  if (!existing) return { ok: false, status: 404, message: "Data warga tidak ditemukan." };

  await prisma.resident.update({ where: { id: residentId }, data: { photo: parsed.photo, photoThumb: parsed.photoThumb } });

  const keep = new Set([parsed.photo, parsed.photoThumb]);
  const stale = [existing.photo, existing.photoThumb].filter((u): u is string => !!u && !keep.has(u));
  if (stale.length) void deleteMobilePhotos(stale, village.code, [RESIDENT_PHOTO_FOLDER]);

  return { ok: true, photo: parsed.photo, photoThumb: parsed.photoThumb, previous: existing };
}
