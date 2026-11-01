import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId, permissions } from "@/lib/apbdes/http";
import { changeStatus, type StatusAction } from "@/lib/blt/service";

const ACTIONS: StatusAction[] = ["tetapkan", "selesai", "buka", "cabut"];

/**
 * Menetapkan program (setelah Musyawarah Desa dan Keputusan Kepala Desa), menyelesaikan, membuka kembali, atau mencabut penetapan: { action }.
 * Dipetakan ke izin "approve" lewat pola rute (Kepala Desa dan admin), dan dicek lagi di sini.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/blt/[id]/status", "Gagal mengubah status program BLT", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (!permissions(ctx, "blt").approve) return forbidden("Hanya Kepala Desa atau admin yang dapat menetapkan program BLT.");
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Program BLT tidak ditemukan." }, { status: 404 });
    const action = ((await req.json().catch(() => null)) as { action?: unknown } | null)?.action;
    if (typeof action !== "string" || !ACTIONS.includes(action as StatusAction)) return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
    const r = await changeStatus(prisma, { villageId: ctx.village.id, id, action: action as StatusAction });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, "approve", "blt_programs", id, { action, status: r.data.status });
    return NextResponse.json({ success: true, status: r.data.status });
  });
}
