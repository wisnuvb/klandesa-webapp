import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, type PutObjectCommandInput } from "@aws-sdk/client-s3";
import { buildSpacesPublicUrl, getSpacesClient, getSpacesConfig } from "@/lib/spaces";
import { BodyTooLargeError, readBodyWithLimit } from "@/lib/blog/image-upload";
import { RATE } from "@/lib/aspirasi/catalog";
import { ipHashOf, limitOrNull } from "@/lib/aspirasi/http";
import { ASPIRATION_PHOTO_BODY_LIMIT, ASPIRATION_PHOTO_MAX_BYTES, aspirationPhotoKey, inspectWebp } from "@/lib/aspirasi/photos";

/**
 * Unggah satu foto aspirasi (publik, berbatas laju per perangkat). Hanya WebP tanpa metadata dan maksimal 1,5 MB:
 * formulir mengecilkan serta membersihkan foto di peramban, server memeriksa ulang isinya. Foto tidak tayang sebelum moderasi.
 * Status: 400 · 411 · 413 · 415 · 429 · 502 gagal simpan · 503 penyimpanan belum dikonfigurasi.
 */
export async function POST(req: NextRequest) {
  const limited = await limitOrNull("aspirasi-photo", ipHashOf(req), RATE.photoUploadPerIp);
  if (limited) return limited;

  const contentType = req.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data\s*;/i.test(contentType)) return NextResponse.json({ error: "Gunakan multipart/form-data dengan field `file`." }, { status: 415 });
  const rawLength = req.headers.get("content-length");
  const declared = rawLength === null || rawLength.trim() === "" ? NaN : Number(rawLength);
  if (!Number.isFinite(declared) || declared < 0) return NextResponse.json({ error: "Content-Length wajib disertakan." }, { status: 411 });
  if (declared > ASPIRATION_PHOTO_BODY_LIMIT) return NextResponse.json({ error: "Ukuran foto maksimal 1,5 MB." }, { status: 413 });

  let raw: Uint8Array;
  try {
    raw = await readBodyWithLimit(req.body, ASPIRATION_PHOTO_BODY_LIMIT);
  } catch (e) {
    if (e instanceof BodyTooLargeError) return NextResponse.json({ error: "Ukuran foto maksimal 1,5 MB." }, { status: 413 });
    return NextResponse.json({ error: "Gagal membaca unggahan." }, { status: 400 });
  }
  const form = await new Response(raw as BodyInit, { headers: { "content-type": contentType } }).formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size <= 0) return NextResponse.json({ error: "Berkas foto tidak ditemukan." }, { status: 400 });
  if (file.size > ASPIRATION_PHOTO_MAX_BYTES) return NextResponse.json({ error: "Ukuran foto maksimal 1,5 MB." }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = inspectWebp(bytes);
  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 415 });

  let cfg: ReturnType<typeof getSpacesConfig>;
  try {
    cfg = getSpacesConfig();
  } catch {
    return NextResponse.json({ error: "Penyimpanan foto belum dikonfigurasi." }, { status: 503 });
  }
  const key = aspirationPhotoKey(globalThis.crypto.randomUUID());
  const aclOn = process.env.SPACES_USE_OBJECT_ACL !== "false";
  const input: PutObjectCommandInput = {
    Bucket: cfg.bucket,
    Key: key,
    Body: bytes,
    ContentType: "image/webp",
    ContentLength: bytes.length,
    CacheControl: "public, max-age=31536000, immutable",
    ...(aclOn ? { ACL: (cfg.uploadAcl || "public-read") as "public-read" | "private" } : {}),
  };
  try {
    await getSpacesClient().send(new PutObjectCommand(input));
  } catch (e) {
    console.error("[aspirasi-photo] gagal mengunggah ke Spaces:", e);
    return NextResponse.json({ error: "Gagal menyimpan foto. Coba lagi." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, key, previewUrl: buildSpacesPublicUrl(key) }, { status: 201 });
}
