import { Readable } from "node:stream";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getApiSession } from "@/lib/api-session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveVillage } from "@/lib/village";
import { getSpacesClient, getSpacesConfig, publicUrlToStorageKey } from "@/lib/spaces";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { canAccessArchiveBinary } from "@/lib/digitalArchive/access";

function mimeForArchive(fileName: string, fileType: string) {
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

/**
 * Stream / unduh berkas arsip. Objek privat (isPublic = false) hanya untuk akun
 * yang mengunggah (uploadedBy).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getApiSession(req);
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
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const archive = await prisma.digitalArchive.findFirst({
      where: { id: BigInt(id), villageId: village.id },
      select: {
        fileName: true,
        filePath: true,
        storageKey: true,
        fileType: true,
        isPublic: true,
        uploadedBy: true,
      },
    });

    if (!archive) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (
      !canAccessArchiveBinary({
        role: session.user.role,
        userId,
        isPublic: archive.isPublic,
        uploadedByUserId: archive.uploadedBy,
      })
    ) {
      return NextResponse.json(
        { error: "Akses ditolak untuk berkas ini" },
        { status: 403 },
      );
    }

    const forceDownload = req.nextUrl.searchParams.get("download") === "1";

    if (
      archive.isPublic &&
      archive.filePath &&
      /^https?:\/\//i.test(archive.filePath) &&
      !forceDownload
    ) {
      return NextResponse.redirect(archive.filePath);
    }

    const key =
      archive.storageKey?.trim() || publicUrlToStorageKey(archive.filePath);
    if (!key) {
      return NextResponse.json({ error: "Storage key tidak ditemukan" }, { status: 500 });
    }

    const s3 = getSpacesClient();
    const cfg = getSpacesConfig();

    const obj = await s3.send(
      new GetObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
      }),
    );

    const body = obj.Body;
    if (!body) {
      return NextResponse.json({ error: "Berkas kosong" }, { status: 404 });
    }

    const disposition =
      req.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
    const contentType = obj.ContentType || mimeForArchive(archive.fileName, archive.fileType);

    let webBody: ReadableStream | null = null;
    if (
      body &&
      typeof (body as { transformToWebStream?: () => ReadableStream })
        .transformToWebStream === "function"
    ) {
      webBody = (body as { transformToWebStream: () => ReadableStream }).transformToWebStream();
    } else if (body instanceof Readable) {
      // Node `Readable.toWeb` using type stream/web; DOM `ReadableStream` different in TS.
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
  } catch (error) {
    console.error("GET /api/digital-archives/[id]/file error:", error);
    return NextResponse.json({ error: "Gagal mengambil berkas" }, { status: 500 });
  }
}
