import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { attempt, failResponse, forbidden, parseIntId, permissions } from "@/lib/apbdes/http";
import { transition } from "@/lib/musdes/service";

const ACTIONS = ["held", "cancel", "minutes", "finalize", "reopen", "all-present"] as const;
type Action = (typeof ACTIONS)[number];
const isAction = (v: unknown): v is Action => typeof v === "string" && (ACTIONS as readonly string[]).includes(v);

/**
 * Perubahan tahap musyawarah. Rutenya POST (dipetakan "create"), jadi izin sebenarnya dicek di sini:
 * membuka kembali berita acara final = "approve" (Kepala Desa/admin); aksi lain = "update".
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return attempt("POST /api/musdes/[id]/aksi", "Gagal memproses musyawarah", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const id = parseIntId((await params).id);
    if (!id) return NextResponse.json({ error: "Musyawarah tidak ditemukan." }, { status: 404 });
    const body = await req.json().catch(() => null);
    const action = (body as { action?: unknown } | null)?.action;
    if (!isAction(action)) return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
    const can = permissions(ctx, "perencanaan");
    if (action === "reopen" ? !can.approve : !can.update) return forbidden(action === "reopen" ? "Hanya Kepala Desa atau admin yang dapat membuka kembali berita acara final." : "Anda tidak berwenang mengubah musyawarah.");
    const r = await transition(prisma, { villageId: ctx.village.id, id, userId: ctx.userId ?? null, action, input: body });
    if (!r.ok) return failResponse(r);
    await auditWeb(req, ctx, action === "reopen" ? "approve" : "update", "village_meetings", id, { action, status: r.data.status, ...(action === "reopen" || action === "cancel" ? { reason: String((body as { reason?: unknown }).reason ?? "").slice(0, 300) } : {}) });
    return NextResponse.json({ success: true, status: r.data.status, warnings: r.data.warnings });
  });
}
