import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileError } from "@/lib/mobile/context";
import { auditFee, requireFeeActor } from "@/lib/mobile/fees";
import { cashScope } from "@/lib/mobile/fees-report";
import { isOwnReportPhotoUrl } from "@/lib/mobile/report-logic";
import { validateCashEntry } from "@/lib/mobile/fees-logic";
import { getSpacesConfig } from "@/lib/spaces";

/** Buku kas di luar iuran: 100 entri terbaru (tidak termasuk yang dibatalkan). */
export async function GET(req: NextRequest) {
  const g = await requireFeeActor(req, "read");
  if (!g.ok) return g.response;
  const rows = await prisma.cashEntry.findMany({ where: { ...cashScope(g.actor), voidedAt: null }, orderBy: [{ entryDate: "desc" }, { id: "desc" }], take: 100 });
  return NextResponse.json({ items: rows.map((r) => ({ id: r.id, type: r.type, amount: r.amount, category: r.category, description: r.description, entryDate: r.entryDate.toISOString().slice(0, 10), receiptUrl: r.receiptUrl })) });
}

export async function POST(req: NextRequest) {
  const g = await requireFeeActor(req, "write");
  if (!g.ok) return g.response;
  const a = g.actor;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const v = validateCashEntry(body, new Date());
  if (!v.ok) return mobileError("INVALID_REQUEST", v.message, 400);
  const r = body?.receiptUrl;
  if (r != null && r !== "" && !isOwnReportPhotoUrl(r, getSpacesConfig().cdnBaseUrl, a.villageCode, "mobile-fees")) {
    return mobileError("INVALID_REQUEST", "Foto nota tidak valid. Unggah ulang dari aplikasi.", 400);
  }
  const created = await prisma.cashEntry.create({
    data: {
      villageId: a.villageId, scope: a.kind, rt: a.rt, rw: a.rw, type: v.type, amount: v.amount, category: v.category,
      description: v.description, entryDate: v.entryDate, receiptUrl: typeof r === "string" && r ? r : null, recordedByType: a.byType, recordedById: a.byId,
    },
    select: { id: true },
  });
  void auditFee(req, a, "create_cash_entry", "cash_entries", created.id, { type: v.type, amount: v.amount, category: v.category, hasReceipt: Boolean(r) });
  return NextResponse.json({ id: created.id }, { status: 201 });
}
