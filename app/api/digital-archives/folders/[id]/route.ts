import { getApiSession } from "@/lib/api-session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import { buildFolderPath, slugFolderSegment } from "@/lib/digitalArchive/folderPath";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";

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

    const { id: rawId } = await params;
    const idNum = parseInt(rawId, 10);
    if (Number.isNaN(idNum) || idNum <= 0) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
    const folderId = BigInt(idNum);

    const folder = await prisma.digitalArchiveFolder.findFirst({
      where: { id: folderId, villageId: village.id },
      select: {
        id: true,
        parentId: true,
        name: true,
        path: true,
      },
    });

    if (!folder) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as { name?: string };
    const newName = (body.name || "").toString().trim();
    if (!newName) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const parent = folder.parentId
      ? await prisma.digitalArchiveFolder.findFirst({
          where: { id: folder.parentId, villageId: village.id },
          select: { path: true },
        })
      : null;
    const parentPath = parent?.path ?? null;

    const oldPath = folder.path;
    const baseSeg = slugFolderSegment(newName);
    let newBasePath = buildFolderPath(parentPath, baseSeg);
    let n = 2;
    while (
      newBasePath !== oldPath &&
      (await prisma.digitalArchiveFolder.findFirst({
        where: {
          villageId: village.id,
          path: newBasePath,
          NOT: { id: folderId },
        },
        select: { id: true },
      }))
    ) {
      newBasePath = buildFolderPath(parentPath, `${baseSeg}-${n}`);
      n += 1;
    }

    if (newBasePath === oldPath && newName === folder.name) {
      return NextResponse.json({
        id: Number(folder.id),
        parentId: folder.parentId ? Number(folder.parentId) : null,
        name: folder.name,
        path: folder.path,
      });
    }

    const descendants = await prisma.digitalArchiveFolder.findMany({
      where: {
        villageId: village.id,
        OR: [{ id: folderId }, { path: { startsWith: `${oldPath}/` } }],
      },
      select: { id: true, path: true },
    });
    descendants.sort((a, b) => b.path.length - a.path.length);

    await prisma.$transaction(async (tx) => {
      for (const row of descendants) {
        const nextPath =
          row.id === folderId
            ? newBasePath
            : newBasePath + row.path.slice(oldPath.length);
        await tx.digitalArchiveFolder.update({
          where: { id: row.id },
          data: {
            path: nextPath,
            ...(row.id === folderId ? { name: newName.slice(0, 255) } : {}),
          },
        });
      }
    });

    const updated = await prisma.digitalArchiveFolder.findFirst({
      where: { id: folderId },
      select: {
        id: true,
        parentId: true,
        name: true,
        path: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      id: Number(updated!.id),
      parentId: updated!.parentId ? Number(updated!.parentId) : null,
      name: updated!.name,
      path: updated!.path,
      updatedAt: updated!.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("PATCH /api/digital-archives/folders/[id] error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
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

    const { id: rawId } = await params;
    const idNum = parseInt(rawId, 10);
    if (Number.isNaN(idNum) || idNum <= 0) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }
    const folderId = BigInt(idNum);

    const folder = await prisma.digitalArchiveFolder.findFirst({
      where: { id: folderId, villageId: village.id },
      select: { id: true, path: true },
    });

    if (!folder) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const childCount = await prisma.digitalArchiveFolder.count({
      where: { villageId: village.id, parentId: folderId },
    });
    if (childCount > 0) {
      return NextResponse.json(
        { error: "Folder berisi subfolder. Hapus subfolder terlebih dahulu." },
        { status: 400 },
      );
    }

    const fileCount = await prisma.digitalArchive.count({
      where: { villageId: village.id, folderId },
    });
    if (fileCount > 0) {
      return NextResponse.json(
        { error: "Folder berisi file. Pindahkan atau hapus file terlebih dahulu." },
        { status: 400 },
      );
    }

    await prisma.digitalArchiveFolder.delete({ where: { id: folderId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/digital-archives/folders/[id] error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }
}
