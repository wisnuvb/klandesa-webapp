import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import ArsipDigitalClient from "./ArsipDigitalClient";
import type { ArchiveEntry, ArchiveFolderEntry } from "./_types";

export default async function ArsipPage() {
  const session = await auth();
  const village = await resolveVillage({ session });

  if (!village) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        Desa tidak ditemukan.
      </div>
    );
  }

  const [archives, folders] = await Promise.all([
    prisma.digitalArchive.findMany({
      where: { villageId: village.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        folderId: true,
        fileName: true,
        filePath: true,
        fileType: true,
        fileSize: true,
        category: true,
        subCategory: true,
        year: true,
        title: true,
        uploadedBy: true,
        uploadedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.digitalArchiveFolder.findMany({
      where: { villageId: village.id },
      orderBy: { path: "asc" },
      select: {
        id: true,
        parentId: true,
        name: true,
        path: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const uploaderIds = Array.from(
    new Set(
      archives.map((a) => a.uploadedBy).filter((id) => typeof id === "number"),
    ),
  );

  const uploaders = await prisma.user.findMany({
    where: {
      villageId: village.id,
      id: { in: uploaderIds },
    },
    select: { id: true, name: true },
  });

  const uploaderNameById = new Map<number, string>(
    uploaders.map((u) => [u.id, u.name]),
  );

  const entries: ArchiveEntry[] = archives.map((a) => ({
    id: Number(a.id),
    folderId: a.folderId ? Number(a.folderId) : null,
    fileName: a.fileName,
    filePath: a.filePath,
    fileType: a.fileType,
    fileSize: Number(a.fileSize),
    category: a.category,
    subCategory: a.subCategory ?? null,
    title: a.title,
    uploadedByName:
      uploaderNameById.get(a.uploadedBy) || `User #${a.uploadedBy}`,
    uploadedAt: a.uploadedAt.toISOString(),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  const initialFolders: ArchiveFolderEntry[] = folders.map((f) => ({
    id: Number(f.id),
    parentId: f.parentId ? Number(f.parentId) : null,
    name: f.name,
    path: f.path,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }));

  return (
    <ArsipDigitalClient
      initialEntries={entries}
      initialFolders={initialFolders}
      villageStorage={{
        subscriptionPlan: village.subscriptionPlan,
        storageLimitGb: village.storageLimit,
      }}
    />
  );
}
