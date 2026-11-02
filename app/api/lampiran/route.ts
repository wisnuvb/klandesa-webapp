import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { canVillageUser } from "@/lib/permissions/can";
import { ATTACHMENT_ENTITIES, ATTACHMENT_READ_ACTION, ATTACHMENT_WRITE_ACTION } from "@/lib/attachments/catalog";
import { attach, entityExists, listAttachments, parseAttachInput, parseRef } from "@/lib/attachments/service";
import { failResponse } from "@/lib/tata-kelola/http";

/**
 * Lampiran rekaman (surat, SK, perangkat, lembaga, rapat, mutasi) yang berkas aslinya ada di Arsip Digital.
 * Izin ditentukan oleh rekaman induknya (bukan oleh sumber daya "archive"), jadi dicek di sini per jenis rekaman.
 */

/** GET /api/lampiran?type=MAIL_REGISTER&id=12 */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const sp = req.nextUrl.searchParams;
    const ref = parseRef(sp.get("type"), sp.get("id"));
    if (!ref.ok) return failResponse(ref);
    const { resource } = ATTACHMENT_ENTITIES[ref.data.type];
    if (!canVillageUser(ctx.session, resource, ATTACHMENT_READ_ACTION)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    if (!(await entityExists(prisma, ctx.village.id, ref.data))) return NextResponse.json({ error: "Rekaman tidak ditemukan" }, { status: 404 });
    const items = await listAttachments(prisma, ctx.village.id, ref.data);
    return NextResponse.json({ items, canEdit: canVillageUser(ctx.session, resource, ATTACHMENT_WRITE_ACTION) });
  } catch (e) {
    console.error("GET /api/lampiran error:", e);
    return NextResponse.json({ error: "Gagal memuat lampiran" }, { status: 500 });
  }
}

/** POST /api/lampiran { type, id, archiveId, label? } — menautkan berkas Arsip Digital yang sudah diunggah. */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const input = parseAttachInput(await req.json().catch(() => null));
    if (!input.ok) return failResponse(input);
    const { resource } = ATTACHMENT_ENTITIES[input.data.type];
    if (!canVillageUser(ctx.session, resource, ATTACHMENT_WRITE_ACTION)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    const r = await attach(prisma, { villageId: ctx.village.id, userId: ctx.userId ?? null, input: input.data });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "create", "record_attachments", r.data.id, { entityType: input.data.type, entityId: Number(input.data.id), archiveId: r.data.archiveId });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  } catch (e) {
    console.error("POST /api/lampiran error:", e);
    return NextResponse.json({ error: "Gagal melampirkan berkas" }, { status: 500 });
  }
}
