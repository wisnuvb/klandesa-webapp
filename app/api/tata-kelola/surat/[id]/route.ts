import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { updateRegister } from "@/lib/tata-kelola/register";
import { failResponse, parseIntId } from "@/lib/tata-kelola/http";

type Ctx = { params: Promise<{ id: string }> };

/** Ubah isi surat (arah dan nomor agenda tetap). Tidak ada hapus: buku agenda tak boleh berlubang. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Surat tidak ditemukan" }, { status: 404 });
    const r = await updateRegister(prisma, { villageId: ctx.village.id, id, input: await req.json().catch(() => null) });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "update", "mail_register", id, { direction: r.data.direction, agenda: r.data.agendaLabel });
    return NextResponse.json({ success: true, item: r.data });
  } catch (e) {
    console.error("PATCH /api/tata-kelola/surat/[id] error:", e);
    return NextResponse.json({ error: "Gagal menyimpan perubahan" }, { status: 500 });
  }
}
