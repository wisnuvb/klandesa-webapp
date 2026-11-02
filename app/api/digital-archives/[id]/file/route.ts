import { requireVillageApiContext } from "@/lib/api-village-context";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { canAccessArchiveBinary } from "@/lib/digitalArchive/access";
import { archiveObjectResponse } from "@/lib/digitalArchive/stream";

/**
 * Stream / unduh berkas arsip. Objek privat (isPublic = false) hanya untuk akun
 * yang mengunggah (uploadedBy).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, session, userId } = loaded.ctx;
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

    return archiveObjectResponse(archive, village.code, req.nextUrl.searchParams.get("download") === "1");
  } catch (error) {
    console.error("GET /api/digital-archives/[id]/file error:", error);
    return NextResponse.json({ error: "Gagal mengambil berkas" }, { status: 500 });
  }
}
