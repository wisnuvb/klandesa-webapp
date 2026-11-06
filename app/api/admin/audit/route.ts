import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requirePlatformSession } from "@/app/api/admin/_auth";
import { prisma } from "@/lib/prisma";
import { parsePositiveInt } from "@/lib/platform/admins/validation";
import { TARGET_TYPE_LABELS, redactMetadata } from "@/lib/platform/admins/audit-labels";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;
const ACTION_RE = /^[a-z0-9_.]{1,80}$/;
/** Pencarian bebas (q) tanpa saringan tanggal dibatasi 90 hari terakhir agar tidak memindai seluruh tabel. */
const DEFAULT_Q_WINDOW_MS = 90 * 86_400_000;

function parseDate(raw: string | null, endOfDay: boolean): Date | null {
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/.test(raw)) return null;
  const d = new Date(/T/.test(raw) ? raw : `${raw}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+07:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Penampil jejak audit (hanya-baca). Saring: actorId, action (tepat, atau awalan bila diakhiri "."), targetType, villageId,
 * q (targetId tepat ATAU awalan email aktor), from/to (WIB). Urut id turun, kursor `cursor` = id terakhir, maks 100 baris.
 */
export async function GET(req: NextRequest) {
  const auth = await requirePlatformSession(req);
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

  const where: Prisma.PlatformAuditLogWhereInput = {};
  const and: Prisma.PlatformAuditLogWhereInput[] = [];

  if (sp.get("actorId")) {
    const id = parsePositiveInt(sp.get("actorId"));
    if (!id) return bad("actorId tidak valid.");
    where.actorId = id;
  }
  const action = sp.get("action")?.trim();
  if (action) {
    if (!ACTION_RE.test(action)) return bad("action tidak valid.");
    if (action.endsWith(".")) where.action = { startsWith: action };
    else where.action = action;
  }
  const targetType = sp.get("targetType")?.trim();
  if (targetType) {
    if (!(targetType in TARGET_TYPE_LABELS)) return bad("targetType tidak dikenal.");
    where.targetType = targetType;
  }
  if (sp.get("villageId")) {
    const id = parsePositiveInt(sp.get("villageId"));
    if (!id) return bad("villageId tidak valid.");
    where.villageId = id;
  }
  const from = parseDate(sp.get("from"), false);
  const to = parseDate(sp.get("to"), true);
  if ((sp.get("from") && !from) || (sp.get("to") && !to)) return bad("Tanggal tidak valid (format YYYY-MM-DD).");
  const q = sp.get("q")?.trim().slice(0, 100);
  const createdAt: Prisma.DateTimeFilter = {};
  if (from) createdAt.gte = from;
  if (to) createdAt.lte = to;
  if (q && !from) createdAt.gte = new Date(Date.now() - DEFAULT_Q_WINDOW_MS);
  if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;
  if (q) and.push({ OR: [{ targetId: q }, { actorEmail: { startsWith: q.toLowerCase() } }] });

  let cursor: bigint | null = null;
  if (sp.get("cursor")) {
    if (!/^\d{1,18}$/.test(sp.get("cursor")!)) return bad("cursor tidak valid.");
    cursor = BigInt(sp.get("cursor")!);
    and.push({ id: { lt: cursor } });
  }
  if (and.length) where.AND = and;

  const limitRaw = sp.get("limit") ? parsePositiveInt(sp.get("limit")) : DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, limitRaw ?? DEFAULT_LIMIT);

  const rows = await prisma.platformAuditLog.findMany({ where, orderBy: { id: "desc" }, take: limit + 1 });
  const page = rows.slice(0, limit);
  return NextResponse.json(
    {
      items: page.map((r) => ({
        id: r.id.toString(),
        createdAt: r.createdAt.toISOString(),
        actorId: r.actorId,
        actorEmail: r.actorEmail,
        action: r.action,
        targetType: r.targetType,
        targetId: r.targetId,
        villageId: r.villageId,
        summary: r.summary,
        metadata: redactMetadata(r.metadata),
        ipAddress: r.ipAddress,
        userAgent: r.userAgent,
      })),
      nextCursor: rows.length > limit ? page[page.length - 1]!.id.toString() : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
