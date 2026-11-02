import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { canVillageUser } from "@/lib/permissions/can";
import { ATTACHMENT_ENTITIES, ATTACHMENT_WRITE_ACTION, isAttachmentEntityType } from "@/lib/attachments/catalog";
import { detach, findAttachment } from "@/lib/attachments/service";
import { failResponse, parseIntId } from "@/lib/tata-kelola/http";

type Ctx = { params: Promise<{ attId: string }> };

/** Lepas lampiran dari rekamannya. Berkas di Arsip Digital tidak dihapus (tetap tercatat di storage desa). */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const attId = parseIntId((await params).attId);
    if (!attId) return NextResponse.json({ error: "Lampiran tidak ditemukan" }, { status: 404 });
    const row = await findAttachment(prisma, ctx.village.id, attId);
    if (!row || !isAttachmentEntityType(row.entityType)) return NextResponse.json({ error: "Lampiran tidak ditemukan" }, { status: 404 });
    if (!canVillageUser(ctx.session, ATTACHMENT_ENTITIES[row.entityType].resource, ATTACHMENT_WRITE_ACTION)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    const r = await detach(prisma, { villageId: ctx.village.id, attachmentId: attId });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "delete", "record_attachments", attId, { entityType: row.entityType, entityId: Number(row.entityId), archiveId: Number(row.archiveId) });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/lampiran/[attId] error:", e);
    return NextResponse.json({ error: "Gagal melepas lampiran" }, { status: 500 });
  }
}
