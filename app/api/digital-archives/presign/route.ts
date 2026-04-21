import { getApiSession } from "@/lib/api-session";
import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { resolveVillage } from "@/lib/village";
import { prisma } from "@/lib/prisma";
import {
  buildSpacesPublicUrl,
  getSpacesClient,
  getSpacesConfig,
} from "@/lib/spaces";
import { assertStorageForUpload } from "@/lib/digitalArchive/quota";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

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

export async function POST(req: NextRequest) {
  try {
    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }
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
    };

    const fileNameRaw = body.fileName?.toString() || "";
    const contentType =
      body.contentType?.toString() || "application/octet-stream";
    const fileSize = Number(body.fileSize || 0);
    let category = (body.category || "").toString().trim();
    const subCategory = body.subCategory
      ? body.subCategory.toString().trim()
      : null;
    const folderIdRaw = body.folderId;

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
      if (!category) {
        return NextResponse.json(
          { error: "category is required when folderId is omitted" },
          { status: 400 },
        );
      }
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
      village.storageLimit,
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

    const safeName = sanitizeFileName(fileNameRaw);
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

    const cmd = new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      ContentType: contentType,
      ACL: cfg.uploadAcl as "private" | "public-read",
      Metadata: {
        original_filename: safeName,
        ext: ext || "",
        village_code: village.code,
      },
    });

    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 });
    const fileUrl = buildSpacesPublicUrl(key);

    return NextResponse.json({
      uploadUrl,
      fileUrl,
      key,
      uploadHeaders: {
        "Content-Type": contentType,
        "x-amz-acl": cfg.uploadAcl,
      },
    });
  } catch (error) {
    console.error("POST /api/digital-archives/presign error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
