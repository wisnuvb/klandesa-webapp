import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { canVillageUser } from "@/lib/permissions/can";
import { ATTACHMENT_ENTITIES, ATTACHMENT_READ_ACTION, isAttachmentEntityType } from "@/lib/attachments/catalog";
import { countAttachments, parseIdList } from "@/lib/attachments/service";

/** GET /api/lampiran/ringkasan?type=MAIL_REGISTER&ids=1,2,3 → { counts: { "1": 2 } } (hanya rekaman yang punya lampiran). */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const sp = req.nextUrl.searchParams;
    const type = sp.get("type");
    if (!isAttachmentEntityType(type)) return NextResponse.json({ error: "Jenis rekaman tidak dikenal." }, { status: 400 });
    if (!canVillageUser(ctx.session, ATTACHMENT_ENTITIES[type].resource, ATTACHMENT_READ_ACTION)) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    const counts = await countAttachments(prisma, ctx.village.id, type, parseIdList(sp.get("ids")));
    return NextResponse.json({ counts });
  } catch (e) {
    console.error("GET /api/lampiran/ringkasan error:", e);
    return NextResponse.json({ error: "Gagal memuat ringkasan lampiran" }, { status: 500 });
  }
}
