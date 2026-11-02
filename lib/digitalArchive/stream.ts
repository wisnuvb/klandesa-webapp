/**
 * Mengalirkan satu berkas Arsip Digital ke respons HTTP. Dipakai bersama rute berkas arsip dan rute lampiran;
 * pemeriksaan siapa yang boleh membuka berkas dilakukan pemanggil (arsip: pengunggah/admin; lampiran: izin atas rekaman induknya).
 */
import { Readable } from "node:stream";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { getSpacesClient, getSpacesConfig, publicUrlToStorageKey } from "@/lib/spaces";
import { isVillageArchiveKey } from "@/lib/digitalArchive/media";

export function mimeForArchive(fileName: string, fileType: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || fileType.toLowerCase();
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
  };
  return map[ext] || "application/octet-stream";
}

export interface StreamableArchive {
  fileName: string;
  fileType: string;
  filePath: string;
  storageKey: string | null;
  isPublic: boolean;
}

export async function archiveObjectResponse(archive: StreamableArchive, villageCode: string, forceDownload: boolean): Promise<NextResponse> {
  const key = archive.storageKey?.trim() || publicUrlToStorageKey(archive.filePath);
  // Isolasi antar-desa: hanya objek di folder arsip desa ini yang boleh dialirkan atau diarahkan.
  if (!isVillageArchiveKey(key, villageCode)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (archive.isPublic && archive.filePath && /^https?:\/\//i.test(archive.filePath) && !forceDownload) {
    return NextResponse.redirect(archive.filePath);
  }

  const s3 = getSpacesClient();
  const cfg = getSpacesConfig();
  const obj = await s3.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key as string }));

  const body = obj.Body;
  if (!body) {
    return NextResponse.json({ error: "Berkas kosong" }, { status: 404 });
  }

  const disposition = forceDownload ? "attachment" : "inline";
  const contentType = obj.ContentType || mimeForArchive(archive.fileName, archive.fileType);

  let webBody: ReadableStream | null = null;
  if (typeof (body as { transformToWebStream?: () => ReadableStream }).transformToWebStream === "function") {
    webBody = (body as { transformToWebStream: () => ReadableStream }).transformToWebStream();
  } else if (body instanceof Readable) {
    // Node `Readable.toWeb` memakai tipe stream/web; `ReadableStream` DOM berbeda di TS.
    webBody = Readable.toWeb(body) as ReadableStream;
  }

  if (!webBody) {
    return NextResponse.json({ error: "Stream tidak didukung" }, { status: 500 });
  }

  return new NextResponse(webBody, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(archive.fileName)}"`,
      "Cache-Control": archive.isPublic ? "public, max-age=3600" : "private, no-store",
    },
  });
}
