import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { prisma } from "@/lib/prisma";
import { revokeApiKey } from "@/lib/api-keys/keys";

/** Cabut kunci API. Berlaku seketika; kunci yang dicabut tidak bisa dipakai lagi dan tidak bisa diaktifkan kembali. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (ctx.dbUser.role !== "admin") return NextResponse.json({ error: "Hanya admin desa yang dapat mengelola kunci API." }, { status: 403 });

    const id = parseInt((await params).id, 10);
    if (!Number.isInteger(id)) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

    const ok = await revokeApiKey(prisma, { villageId: ctx.village.id, id, userId: ctx.userId ?? null });
    if (!ok) return NextResponse.json({ error: "Kunci tidak ditemukan atau sudah dicabut." }, { status: 404 });

    await auditWeb(req, ctx, "revoke", "api_keys", id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/developer/keys/[id] error:", e);
    return NextResponse.json({ error: "Gagal mencabut kunci API" }, { status: 500 });
  }
}
