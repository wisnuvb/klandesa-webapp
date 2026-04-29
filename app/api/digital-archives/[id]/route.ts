import { getApiSession } from "@/lib/api-session";
import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import { getSpacesClient, getSpacesConfig, publicUrlToStorageKey } from "@/lib/spaces";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { canDeleteArchiveRecord } from "@/lib/digitalArchive/access";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const existing = await prisma.digitalArchive.findFirst({
      where: { id: BigInt(id), villageId: village.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as {
      action?: string;
      title?: string;
      description?: string | null;
      galleryCategory?: string;
    } | null;

    const action = (body?.action || "").toString();

    if (action === "gallery_assign") {
      const title = (body?.title || "").toString().trim();
      const description =
        body?.description === null || body?.description === undefined
          ? null
          : body.description.toString();
      const galleryCategory = (body?.galleryCategory || "").toString().trim();

      if (!title) {
        return NextResponse.json(
          { error: "title is required" },
          { status: 400 },
        );
      }
      if (!galleryCategory) {
        return NextResponse.json(
          { error: "galleryCategory is required" },
          { status: 400 },
        );
      }

      const updated = await prisma.digitalArchive.update({
        where: { id: BigInt(id) },
        data: {
          category: "GALERI_DESA",
          subCategory: galleryCategory,
          title,
          description,
          isPublic: true,
          lastAccessed: new Date(),
        },
        select: {
          id: true,
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
          downloadCount: true,
          updatedAt: true,
        },
      });

      const uploader = await prisma.user.findFirst({
        where: { id: updated.uploadedBy, villageId: village.id },
        select: { name: true },
      });

      return NextResponse.json({
        id: Number(updated.id),
        fileName: updated.fileName,
        filePath: updated.filePath,
        fileType: updated.fileType,
        fileSize: Number(updated.fileSize),
        category: updated.category,
        subCategory: updated.subCategory,
        title: updated.title,
        description: updated.description,
        uploadedByName: uploader?.name || `User #${updated.uploadedBy}`,
        uploadedAt: updated.uploadedAt.toISOString(),
        viewsCount: updated.downloadCount,
        updatedAt: updated.updatedAt.toISOString(),
      });
    }

    const inc = action === "download" || action === "view" ? 1 : 0;

    const updated = await prisma.digitalArchive.update({
      where: { id: BigInt(id) },
      data: {
        lastAccessed: new Date(),
        ...(inc ? { downloadCount: { increment: inc } } : {}),
      },
      select: { downloadCount: true },
    });

    return NextResponse.json({ viewsCount: updated.downloadCount });
  } catch (error) {
    console.error("PATCH /api/digital-archives/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const userId = Number(session.user.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.digitalArchive.findFirst({
      where: { id: BigInt(id), villageId: village.id },
      select: {
        id: true,
        filePath: true,
        storageKey: true,
        fileSize: true,
        uploadedBy: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (
      !canDeleteArchiveRecord({
        role: session.user.role,
        userId,
        uploadedByUserId: existing.uploadedBy,
      })
    ) {
      return NextResponse.json(
        { error: "Anda tidak berhak menghapus arsip ini" },
        { status: 403 },
      );
    }

    const key =
      existing.storageKey?.trim() ||
      publicUrlToStorageKey(existing.filePath);
    if (key) {
      try {
        const s3 = getSpacesClient();
        const cfg = getSpacesConfig();
        await s3.send(
          new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }),
        );
      } catch (e) {
        console.error("DELETE Spaces object error:", e);
        return NextResponse.json(
          {
            error:
              "Gagal menghapus berkas di penyimpanan. Data arsip tidak dihapus; coba lagi.",
          },
          { status: 502 },
        );
      }
    }

    const deltaGb = Number(existing.fileSize) / (1024 * 1024 * 1024);

    await prisma.$transaction(async (tx) => {
      await tx.digitalArchive.delete({ where: { id: BigInt(id) } });
      const v = await tx.village.findUnique({
        where: { id: village.id },
        select: { storageUsed: true },
      });
      const next = Math.max(0, (v?.storageUsed ?? 0) - deltaGb);
      await tx.village.update({
        where: { id: village.id },
        data: { storageUsed: next },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/digital-archives/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
