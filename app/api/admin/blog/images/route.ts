import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand, type PutObjectCommandInput } from "@aws-sdk/client-s3";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { auditPlatform } from "@/lib/platform/audit";
import { actorOf } from "@/lib/platform/legacy-audit";
import { buildSpacesPublicUrl, getSpacesClient, getSpacesConfig } from "@/lib/spaces";
import {
  BLOG_IMAGE_MAX_BYTES,
  BLOG_UPLOAD_BODY_LIMIT,
  BodyTooLargeError,
  blogImageKey,
  readBodyWithLimit,
  sniffImageType,
} from "@/lib/blog/image-upload";

/**
 * Unggah gambar blog (cover atau gambar di dalam artikel) ke Spaces, lewat server:
 * tidak perlu CORS bucket, dan tipe/ukuran diperiksa dari isi berkas sebelum disimpan.
 * Multipart: field `file`. Content-Length wajib; body dibaca dengan batas byte nyata.
 * Status: 401/403 auth · 411 tanpa Content-Length · 413 terlalu besar · 415 bukan multipart/format salah · 503 Spaces belum dikonfigurasi · 502 gagal simpan.
 */
export async function POST(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  // Hanya multipart/form-data (FormData peramban).
  const contentType = req.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data\s*;/i.test(contentType)) {
    return NextResponse.json({ error: "Gunakan multipart/form-data dengan field `file`." }, { status: 415 });
  }

  // Content-Length wajib (tanpa itu ukuran tak bisa ditolak lebih awal) dan tidak boleh melebihi batas.
  const rawLength = req.headers.get("content-length");
  const declared = rawLength === null || rawLength.trim() === "" ? NaN : Number(rawLength);
  if (!Number.isFinite(declared) || declared < 0) {
    return NextResponse.json({ error: "Content-Length wajib disertakan." }, { status: 411 });
  }
  if (declared > BLOG_UPLOAD_BODY_LIMIT) {
    return NextResponse.json({ error: "Ukuran gambar maksimal 5 MB." }, { status: 413 });
  }

  // Header bisa berbohong: baca body dengan batas byte nyata, bukan req.formData() yang tak terbatas.
  let raw: Uint8Array;
  try {
    raw = await readBodyWithLimit(req.body, BLOG_UPLOAD_BODY_LIMIT);
  } catch (e) {
    if (e instanceof BodyTooLargeError) {
      return NextResponse.json({ error: "Ukuran gambar maksimal 5 MB." }, { status: 413 });
    }
    return NextResponse.json({ error: "Gagal membaca unggahan." }, { status: 400 });
  }
  const form = await new Response(raw as BodyInit, { headers: { "content-type": contentType } })
    .formData()
    .catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Berkas gambar tidak ditemukan." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > BLOG_IMAGE_MAX_BYTES) {
    return NextResponse.json({ error: "Ukuran gambar maksimal 5 MB." }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) {
    return NextResponse.json({ error: "Format harus JPG, PNG, atau WebP." }, { status: 415 });
  }

  let cfg: ReturnType<typeof getSpacesConfig>;
  try {
    cfg = getSpacesConfig();
  } catch {
    return NextResponse.json({ error: "Penyimpanan gambar belum dikonfigurasi." }, { status: 503 });
  }

  const key = blogImageKey(type.ext, globalThis.crypto.randomUUID());
  const aclOn = process.env.SPACES_USE_OBJECT_ACL !== "false";
  const input: PutObjectCommandInput = {
    Bucket: cfg.bucket,
    Key: key,
    Body: bytes,
    ContentType: type.mime,
    ContentLength: bytes.length,
    // Nama berkas unik per unggahan, jadi aman di-cache lama di CDN.
    CacheControl: "public, max-age=31536000, immutable",
    ...(aclOn ? { ACL: (cfg.uploadAcl || "public-read") as "public-read" | "private" } : {}),
  };
  try {
    await getSpacesClient().send(new PutObjectCommand(input));
  } catch (e) {
    console.error("[blog-image] gagal mengunggah ke Spaces:", e);
    return NextResponse.json({ error: "Gagal menyimpan gambar. Coba lagi." }, { status: 502 });
  }

  const url = buildSpacesPublicUrl(key);
  await auditPlatform(req, actorOf(auth), {
    action: "blog.image_upload",
    targetType: "system",
    targetId: `blog_image:${key}`,
    summary: `Mengunggah gambar blog (${type.mime}, ${Math.round(bytes.length / 1024)} KB)`,
    metadata: { key, mime: type.mime, bytes: bytes.length },
  });

  return NextResponse.json({ ok: true, url, key, mime: type.mime, bytes: bytes.length }, { status: 201 });
}
