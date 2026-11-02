import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { canVillageUser } from "@/lib/permissions/can";
import { ATTACHMENT_ENTITIES, ATTACHMENT_READ_ACTION, isAttachmentEntityType } from "@/lib/attachments/catalog";
import { findAttachment } from "@/lib/attachments/service";
import { archiveObjectResponse } from "@/lib/digitalArchive/stream";
import { parseIntId } from "@/lib/tata-kelola/http";

type Ctx = { params: Promise<{ attId: string }> };

/**
 * Buka/unduh berkas lampiran. Berbeda dengan /api/digital-archives/[id]/file (berkas privat hanya untuk pengunggah/admin),
 * di sini izin ditentukan oleh rekaman induknya: siapa pun yang boleh membaca surat/SK itu boleh membuka lampirannya.
 * Berkas tetap privat di storage; tidak ada URL publik.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const attId = parseIntId((await params).attId);
    if (!attId) return NextResponse.json({ error: "Lampiran tidak ditemukan" }, { status: 404 });
    const row = await findAttachment(prisma, ctx.village.id, attId);
    if (!row || !isAttachmentEntityType(row.entityType)) return NextResponse.json({ error: "Lampiran tidak ditemukan" }, { status: 404 });
    if (!canVillageUser(ctx.session, ATTACHMENT_ENTITIES[row.entityType].resource, ATTACHMENT_READ_ACTION)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    const archive = await prisma.digitalArchive.findFirst({
      where: { id: row.archiveId, villageId: ctx.village.id },
      select: { fileName: true, fileType: true, filePath: true, storageKey: true, isPublic: true },
    });
    if (!archive) return NextResponse.json({ error: "Berkas sudah dihapus dari Arsip Digital" }, { status: 404 });
    return archiveObjectResponse(archive, ctx.village.code, req.nextUrl.searchParams.get("download") === "1");
  } catch (e) {
    console.error("GET /api/lampiran/[attId]/file error:", e);
    return NextResponse.json({ error: "Gagal mengambil berkas" }, { status: 500 });
  }
}
