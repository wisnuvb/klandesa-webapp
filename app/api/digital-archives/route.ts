import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import { categorySubFromFolderPath } from "@/lib/digitalArchive/folderPath";
import { assertStorageForUpload } from "@/lib/digitalArchive/quota";

function getExtension(name: string) {
  const idx = name.lastIndexOf(".");
  if (idx <= 0 || idx === name.length - 1) return "";
  return name.slice(idx + 1).toLowerCase();
}

function isImageFileTypeString(fileType: string) {
  const v = (fileType || "").toLowerCase();
  const ext = v.replace(/^\./, "");
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) {
    return true;
  }
  return v.startsWith("image/");
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }

    const sp = req.nextUrl.searchParams;
    const take = Math.min(100, Math.max(1, parseInt(sp.get("take") || "24")));
    const skip = Math.max(0, parseInt(sp.get("skip") || "0"));
    const search = (sp.get("search") || "").trim();
    const type = (sp.get("type") || "").trim().toLowerCase();
    const excludeCategory = (sp.get("excludeCategory") || "").trim();

    const where: {
      villageId: number;
      category?: { not: string };
      OR?: Array<Record<string, unknown>>;
    } = {
      villageId: village.id,
    };

    if (excludeCategory) {
      where.category = { not: excludeCategory };
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { fileName: { contains: search } },
      ];
    }

    const rows = await prisma.digitalArchive.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        folderId: true,
        fileName: true,
        filePath: true,
        fileType: true,
        fileSize: true,
        category: true,
        subCategory: true,
        title: true,
        description: true,
        uploadedBy: true,
        uploadedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const imageOnly = type === "image" || type === "images";
    const filtered = imageOnly
      ? rows.filter((r) => isImageFileTypeString(r.fileType))
      : rows;

    const uploaderIds = Array.from(new Set(filtered.map((r) => r.uploadedBy)));
    const uploaders = await prisma.user.findMany({
      where: { villageId: village.id, id: { in: uploaderIds } },
      select: { id: true, name: true },
    });
    const uploaderNameById = new Map<number, string>(
      uploaders.map((u) => [u.id, u.name]),
    );

    return NextResponse.json({
      rows: filtered.map((r) => ({
        id: Number(r.id),
        folderId: r.folderId ? Number(r.folderId) : null,
        fileName: r.fileName,
        filePath: r.filePath,
        fileType: r.fileType,
        fileSize: Number(r.fileSize),
        category: r.category,
        subCategory: r.subCategory,
        title: r.title,
        description: r.description,
        uploadedByName:
          uploaderNameById.get(r.uploadedBy) || `User #${r.uploadedBy}`,
        uploadedAt: r.uploadedAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      take,
      skip,
    });
  } catch (error) {
    console.error("GET /api/digital-archives error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      fileName?: string;
      filePath?: string;
      storageKey?: string | null;
      contentType?: string;
      fileSize?: number;
      category?: string;
      subCategory?: string | null;
      folderId?: number | null;
      title?: string;
      description?: string | null;
      tags?: string[] | null;
      isPublic?: boolean;
      accessLevel?: "admin" | "staff" | "public";
    };

    const fileName = (body.fileName || "").toString().trim();
    const filePath = (body.filePath || "").toString().trim();
    const storageKeyRaw = body.storageKey
      ? body.storageKey.toString().trim()
      : null;
    const contentType = (body.contentType || "").toString().trim();
    const fileSize = Number(body.fileSize || 0);
    let category = (body.category || "").toString().trim();
    let subCategory = body.subCategory
      ? body.subCategory.toString().trim()
      : null;
    const title = (body.title || "").toString().trim() || fileName;
    const description = body.description ? body.description.toString() : null;
    const tags = Array.isArray(body.tags) ? body.tags.map(String) : null;
    const accessLevel = (body.accessLevel || "admin") as
      | "admin"
      | "staff"
      | "public";
    const isPublic = Boolean(body.isPublic) || accessLevel === "public";

    let folderIdBi: bigint | null = null;
    const folderIdParam = body.folderId;
    if (folderIdParam != null) {
      const fid = Number(folderIdParam);
      if (!Number.isFinite(fid) || fid <= 0) {
        return NextResponse.json({ error: "folderId invalid" }, { status: 400 });
      }
      const folder = await prisma.digitalArchiveFolder.findFirst({
        where: { id: BigInt(fid), villageId: village.id },
        select: { id: true, path: true },
      });
      if (!folder) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }
      folderIdBi = folder.id;
      const derived = categorySubFromFolderPath(folder.path);
      category = derived.category;
      subCategory = derived.subCategory;
    }

    if (!fileName || !filePath) {
      return NextResponse.json(
        { error: "fileName and filePath are required" },
        { status: 400 },
      );
    }
    if (!category) {
      return NextResponse.json(
        { error: "category is required (or provide folderId)" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json(
        { error: "fileSize is invalid" },
        { status: 400 },
      );
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

    const deltaGb = fileSize / (1024 * 1024 * 1024);

    const archive = await prisma.$transaction(async (tx) => {
      const created = await tx.digitalArchive.create({
        data: {
          villageId: village.id,
          folderId: folderIdBi,
          fileName,
          filePath,
          storageKey: storageKeyRaw || null,
          fileType: getExtension(fileName) || contentType || "unknown",
          fileSize: BigInt(Math.floor(fileSize)),
          category,
          subCategory: subCategory || null,
          title,
          description,
          tags: tags || undefined,
          isPublic,
          accessLevel,
          uploadedBy: userId,
          uploadedAt: new Date(),
        },
        select: {
          id: true,
          folderId: true,
          fileName: true,
          filePath: true,
          fileType: true,
          fileSize: true,
          category: true,
          subCategory: true,
          title: true,
          uploadedBy: true,
          uploadedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      await tx.village.update({
        where: { id: village.id },
        data: { storageUsed: { increment: deltaGb } },
      });
      return created;
    });

    const uploader = await prisma.user.findFirst({
      where: { id: archive.uploadedBy, villageId: village.id },
      select: { name: true },
    });

    return NextResponse.json({
      id: Number(archive.id),
      folderId: archive.folderId ? Number(archive.folderId) : null,
      fileName: archive.fileName,
      filePath: archive.filePath,
      fileType: archive.fileType,
      fileSize: Number(archive.fileSize),
      category: archive.category,
      subCategory: archive.subCategory,
      title: archive.title,
      uploadedByName: uploader?.name || `User #${archive.uploadedBy}`,
      uploadedAt: archive.uploadedAt.toISOString(),
      createdAt: archive.createdAt.toISOString(),
      updatedAt: archive.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/digital-archives error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
