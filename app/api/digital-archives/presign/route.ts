import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { PutObjectCommand, type PutObjectCommandInput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/prisma";
import {
  buildSpacesPublicUrl,
  getSpacesClient,
  getSpacesConfig,
} from "@/lib/spaces";
import { assertStorageForUpload, getEffectiveStorageLimitGb } from "@/lib/digitalArchive/quota";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import {
  MAX_MEDIA_IMAGE_BYTES,
  MEDIA_CATEGORY,
  MEDIA_IMAGE_MIME_EXT,
  normalizeMime,
  validateImageFile,
} from "@/lib/digitalArchive/media";
import {
  ALLOWED_DOCUMENT_MIME_EXT,
  DEFAULT_CATEGORY,
  validateDocumentFile,
} from "@/lib/digitalArchive/document";
import { normalizeCategoryInput } from "@/lib/digitalArchive/folderPath";

function sanitizeFileName(name: string) {
  return name
    .replace(/[^\w.\-()\s]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function getExtension(name: string) {
  const idx = name.lastIndexOf(".");
  if (idx <= 0 || idx === name.length - 1) return "";
  return name.slice(idx + 1).toLowerCase();
}

/** Bila false, jangan set ACL pada PutObject (bucket Spaces tanpa ACL / policy-only). */
function objectAclEnabled(): boolean {
  return process.env.SPACES_USE_OBJECT_ACL !== "false";
}

export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = (await req.json()) as {
      fileName?: string;
      contentType?: string;
      fileSize?: number;
      category?: string;
      subCategory?: string | null;
      folderId?: number | null;
      isPublic?: boolean;
      accessLevel?: string;
      /** "image": aset gambar untuk konten (publik, hanya JPG/PNG/WebP/GIF, maks 5 MB). */
      kind?: string;
    };

    const isImageAsset = body.kind === "image";
    const fileNameRaw = body.fileName?.toString() || "";
    const fileSize = Number(body.fileSize || 0);

    if (!fileNameRaw) {
      return NextResponse.json(
        { error: "fileName is required" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json(
        { error: "fileSize is invalid" },
        { status: 400 },
      );
    }

    let category = normalizeCategoryInput((body.category || "").toString());
    let contentType: string;
    if (isImageAsset) {
      contentType = normalizeMime(body.contentType?.toString());
      const invalid = validateImageFile({ type: contentType, size: fileSize });
      if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
      if (!category && body.folderId == null) category = MEDIA_CATEGORY;
    } else {
      const invalid = validateDocumentFile({ name: fileNameRaw, size: fileSize });
      if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
      if (!category && body.folderId == null) category = DEFAULT_CATEGORY;
      // Content-Type ditentukan dari ekstensi yang sudah divalidasi, bukan klaim klien yang
      // bisa disetel bebas (mis. text/html) untuk mengeksploitasi objek publik.
      contentType = ALLOWED_DOCUMENT_MIME_EXT[getExtension(fileNameRaw)] || "application/octet-stream";
    }
    const subCategory = body.subCategory
      ? normalizeCategoryInput(body.subCategory.toString())
      : null;
    const folderIdRaw = body.folderId;

    // Aset gambar dipakai di konten publik (website, pengumuman), jadi selalu publik.
    const aclPublic =
      isImageAsset ||
      Boolean(body.isPublic) ||
      (body.accessLevel || "").toString() === "public";

    let pathSegments: string[] = [];

    if (folderIdRaw != null) {
      const fid = Number(folderIdRaw);
      if (!Number.isFinite(fid) || fid <= 0) {
        return NextResponse.json({ error: "folderId invalid" }, { status: 400 });
      }
      const folder = await prisma.digitalArchiveFolder.findFirst({
        where: { id: BigInt(fid), villageId: village.id },
        select: { path: true },
      });
      if (!folder) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }
      pathSegments = folder.path
        .split("/")
        .filter(Boolean)
        .map((s) => sanitizeFileName(s).replace(/\s+/g, "-"));
      if (!category) {
        category = pathSegments[0] || "Arsip";
      }
    } else {
      // category sudah dijamin terisi (default DEFAULT_CATEGORY/MEDIA_CATEGORY) di atas.
      const categoryPath = sanitizeFileName(category).replace(/\s+/g, "-");
      pathSegments = [categoryPath];
      if (subCategory) {
        pathSegments.push(
          sanitizeFileName(subCategory).replace(/\s+/g, "-"),
        );
      }
    }

    const quota = await assertStorageForUpload(
      village.id,
      await getEffectiveStorageLimitGb(village),
      fileSize,
    );
    if (!quota.ok) {
      return NextResponse.json(
        {
          error: "Storage limit exceeded",
          meta: quota.meta,
        },
        { status: 400 },
      );
    }

    let safeName = sanitizeFileName(fileNameRaw);
    if (isImageAsset) {
      // Ekstensi mengikuti tipe yang diizinkan, bukan nama dari klien.
      const dot = safeName.lastIndexOf(".");
      const base = (dot > 0 ? safeName.slice(0, dot) : safeName).trim() || "gambar";
      safeName = `${base}.${MEDIA_IMAGE_MIME_EXT[contentType]}`;
    }
    const ext = getExtension(safeName);
    const now = new Date();
    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const uuid = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const key = [
      "villages",
      village.code,
      "digital-archives",
      yyyy,
      mm,
      ...pathSegments,
      `${uuid}-${safeName}`,
    ].join("/");

    const s3 = getSpacesClient();
    const cfg = getSpacesConfig();

    const objectAcl = aclPublic
      ? ((cfg.uploadAcl || "public-read") as "private" | "public-read")
      : "private";

    const baseInput: PutObjectCommandInput = {
      Bucket: cfg.bucket,
      Key: key,
      ContentType: contentType,
      // Ukuran ikut ditandatangani: PUT dengan ukuran lain ditolak storage.
      ...(isImageAsset ? { ContentLength: Math.min(fileSize, MAX_MEDIA_IMAGE_BYTES) } : {}),
      Metadata: {
        original_filename: safeName,
        ext: ext || "",
        village_code: village.code,
      },
    };

    if (objectAclEnabled()) {
      baseInput.ACL = objectAcl;
    }

    const cmd = new PutObjectCommand(baseInput);

    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 });
    const fileUrl = buildSpacesPublicUrl(key);

    const uploadHeaders: Record<string, string> = {
      "Content-Type": contentType,
    };
    if (objectAclEnabled()) {
      uploadHeaders["x-amz-acl"] = objectAcl;
    }

    return NextResponse.json({
      uploadUrl,
      fileUrl,
      key,
      uploadHeaders,
      acl: objectAclEnabled() ? objectAcl : null,
    });
  } catch (error) {
    console.error("POST /api/digital-archives/presign error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
