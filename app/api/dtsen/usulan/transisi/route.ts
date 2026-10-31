import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { transition } from "@/lib/dtsen/service";
import { can, denied, failResponse } from "@/lib/tata-kelola/http";

/**
 * Pindahkan satu atau beberapa usulan ke tahap berikutnya: { ids, to, ...isian tahap }.
 * Rute POST ini dipetakan "create" oleh peta izin, jadi izin "update" dicek di sini.
 */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!can("dtsen_usulan", ctx.dbUser.role, ["update"]).update) return denied("Peran Anda tidak berwenang memproses usulan DTSEN.");
    const body = await req.json().catch(() => null);
    const r = await transition(prisma, { villageId: ctx.village.id, input: body });
    if (!r.ok) return failResponse(r);
    if (r.data.moved.length) await auditWeb(req, ctx, "transition", "dtsen_proposals", r.data.moved.join(",").slice(0, 200), { to: (body as { to?: string }).to, count: r.data.moved.length });
    return NextResponse.json({ success: true, ...r.data });
  } catch (e) {
    console.error("POST /api/dtsen/usulan/transisi error:", e);
    return NextResponse.json({ error: "Gagal memproses usulan" }, { status: 500 });
  }
}
