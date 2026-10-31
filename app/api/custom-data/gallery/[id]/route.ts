import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { parseIntId } from "@/lib/custom-data/http";
import { getTemplateDetail } from "@/lib/village-apps/service";

/** Pratinjau satu templat: tabel, kolom beserta kelas datanya, dan widget dasbor. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const id = parseIntId((await params).id);
    if (id == null) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    const d = await getTemplateDetail(prisma, guard.ctx.village.id, id);
    if (!d) return NextResponse.json({ error: "Templat tidak ditemukan." }, { status: 404 });
    return NextResponse.json(d);
  } catch (e) {
    console.error("GET /api/custom-data/gallery/[id] error:", e);
    return NextResponse.json({ error: "Gagal memuat templat" }, { status: 500 });
  }
}
