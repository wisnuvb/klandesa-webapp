import { NextRequest, NextResponse } from "next/server";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { ACCESS_LOG_RETENTION_DAYS } from "@/lib/api-keys/auth";

/** Jejak pemakaian kunci API desa ini (terbaru dulu). Filter: keyId. Dilihat admin desa. */
export async function GET(req: NextRequest) {
  try {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    if (ctx.dbUser.role !== "admin") return NextResponse.json({ error: "Hanya admin desa yang dapat melihat jejak akses." }, { status: 403 });

    const sp = req.nextUrl.searchParams;
    const keyId = parseInt(sp.get("keyId") ?? "", 10);
    const limit = Math.min(200, Math.max(1, parseInt(sp.get("limit") ?? "50", 10) || 50));
    const rows = await prisma.apiAccessLog.findMany({
      where: { villageId: ctx.village.id, ...(Number.isInteger(keyId) ? { apiKeyId: keyId } : {}) },
      orderBy: { id: "desc" },
      take: limit,
      include: { apiKey: { select: { name: true } } },
    });
    return NextResponse.json({
      retentionDays: ACCESS_LOG_RETENTION_DAYS,
      items: rows.map((r) => ({ id: String(r.id), at: r.createdAt.toISOString(), keyName: r.apiKey?.name ?? null, keyPrefix: r.keyPrefix, method: r.method, path: r.path, status: r.status })),
    });
  } catch (e) {
    console.error("GET /api/developer/access-log error:", e);
    return NextResponse.json({ error: "Gagal memuat jejak akses" }, { status: 500 });
  }
}
