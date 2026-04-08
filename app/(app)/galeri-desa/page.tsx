import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import GaleriDesaClient from "./GaleriDesaClient";
import type { GalleryCategory, GalleryImage } from "./_types";

function normalizeCategory(input: string | null): GalleryCategory {
  const upper = (input || "").toUpperCase().trim();
  if (
    upper === "KEGIATAN" ||
    upper === "PEMBANGUNAN" ||
    upper === "ACARA" ||
    upper === "FASILITAS"
  ) {
    return upper;
  }
  return "LAINNYA";
}

function isHttpUrl(v: string) {
  return /^https?:\/\//.test(v);
}

function isImageFileType(fileType: string) {
  const ext = (fileType || "").toLowerCase().replace(/^\./, "");
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext);
}

export default async function GaleriDesaPage() {
  const session = await auth();
  const village = await resolveVillage({ session });

  if (!village) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        Desa tidak ditemukan.
      </div>
    );
  }

  const rows = await prisma.digitalArchive.findMany({
    where: {
      villageId: village.id,
      category: { in: ["GALERI_DESA", "GALERI", "GALERI DESA", "Galeri Desa"] },
    },
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      filePath: true,
      fileType: true,
      fileSize: true,
      subCategory: true,
      title: true,
      description: true,
      uploadedBy: true,
      uploadedAt: true,
      downloadCount: true,
    },
  });

  const imageRows = rows.filter(
    (r) => isHttpUrl(r.filePath) && isImageFileType(r.fileType),
  );

  const uploaderIds = Array.from(new Set(imageRows.map((r) => r.uploadedBy)));
  const uploaders = await prisma.user.findMany({
    where: { villageId: village.id, id: { in: uploaderIds } },
    select: { id: true, name: true },
  });
  const uploaderNameById = new Map<number, string>(
    uploaders.map((u) => [u.id, u.name]),
  );

  const initialImages: GalleryImage[] = imageRows.map((r) => ({
    id: Number(r.id),
    title: r.title,
    description: r.description ?? "",
    category: normalizeCategory(r.subCategory),
    imageUrl: r.filePath,
    uploadedBy: uploaderNameById.get(r.uploadedBy) || `User #${r.uploadedBy}`,
    uploadDate: r.uploadedAt.toISOString(),
    viewsCount: r.downloadCount,
    fileSizeBytes: Number(r.fileSize),
  }));

  return <GaleriDesaClient initialImages={initialImages} />;
}
