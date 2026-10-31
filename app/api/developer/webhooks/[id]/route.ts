import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { auditWeb } from "@/lib/audit/web-audit";
import { safeUrl } from "@/lib/webhooks/url-guard";
import { prisma } from "@/lib/prisma";
import { deleteEndpoint, updateEndpoint } from "@/lib/webhooks/service";

const adminOnly = () => NextResponse.json({ error: "Hanya admin desa yang dapat mengelola webhook." }, { status: 403 });
const parseId = (raw: string) => (/^\d{1,10}$/.test(raw) && Number(raw) > 0 ? Number(raw) : null);

/** Ubah tujuan: { name?, url?, events?, isActive?, rotateSecret? }. Rahasia baru (bila diganti) hanya muncul di respons ini. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (ctx.dbUser.role !== "admin") return adminOnly();
    const id = parseId((await params).id);
    if (id == null) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });

    const r = await updateEndpoint(prisma, { villageId: ctx.village.id, id, patch: body });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    await auditWeb(req, ctx, "update", "webhook_endpoints", id, {
      name: r.data.endpoint.name,
      url: safeUrl(r.data.endpoint.url),
      events: r.data.endpoint.events,
      isActive: r.data.endpoint.isActive,
      secretRotated: r.data.secret != null,
    });
    return NextResponse.json({ success: true, endpoint: r.data.endpoint, ...(r.data.secret ? { secret: r.data.secret } : {}) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("PATCH /api/developer/webhooks/[id] error:", e);
    return NextResponse.json({ error: "Gagal mengubah webhook" }, { status: 500 });
  }
}

/** Hapus tujuan beserta riwayat pengirimannya. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (ctx.dbUser.role !== "admin") return adminOnly();
    const id = parseId((await params).id);
    if (id == null) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
    if (!(await deleteEndpoint(prisma, { villageId: ctx.village.id, id }))) return NextResponse.json({ error: "Tujuan tidak ditemukan." }, { status: 404 });
    await auditWeb(req, ctx, "delete", "webhook_endpoints", id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/developer/webhooks/[id] error:", e);
    return NextResponse.json({ error: "Gagal menghapus webhook" }, { status: 500 });
  }
}
