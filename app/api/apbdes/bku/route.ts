import { NextRequest, NextResponse } from "next/server";
import { auditWeb } from "@/lib/audit/web-audit";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { prisma } from "@/lib/prisma";
import { monthOf, balancesOf, sortEntries } from "@/lib/apbdes/ledger";
import { addEntry, entryView, loadEntries, monthStatuses, payoutLinkedIds } from "@/lib/apbdes/service";
import { fromCents } from "@/lib/coop/loan-math";
import { failResponse, attempt, permissions, yearOf } from "@/lib/apbdes/http";

/** Catatan Buku Kas Umum satu tahun (?year=&month=) beserta saldo awal dan akhir periode yang dilihat. */
export async function GET(req: NextRequest) {
  return attempt("GET /api/apbdes/bku", "Gagal memuat buku kas", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const year = yearOf(req.nextUrl.searchParams.get("year"));
    const m = Number(req.nextUrl.searchParams.get("month"));
    const month = Number.isInteger(m) && m >= 1 && m <= 12 ? m : undefined;
    const all = await loadEntries(prisma, ctx.village.id, year);
    const payoutIds = await payoutLinkedIds(prisma, ctx.village.id, year);
    const closed = new Set((await monthStatuses(prisma, ctx.village.id, year)).filter((s) => s.state !== "BUKA").map((s) => s.month));
    const inRange = sortEntries(all).filter((e) => month === undefined || monthOf(e.entryDate) === month);
    const before = month === undefined ? null : balancesOf(all.filter((e) => monthOf(e.entryDate) < month));
    const upTo = balancesOf(all.filter((e) => month === undefined || monthOf(e.entryDate) <= month));
    return NextResponse.json({
      year,
      month: month ?? null,
      entries: inRange.map((e) => entryView(e, closed, payoutIds)),
      opening: before ? { tunai: fromCents(before.tunai), bank: fromCents(before.bank) } : { tunai: "0.00", bank: "0.00" },
      closing: { tunai: fromCents(upTo.tunai), bank: fromCents(upTo.bank), pajak: fromCents(upTo.pajak) },
      can: permissions(ctx),
    });
  });
}

/** Mencatat satu transaksi kas. Badan: lihat parseEntryInput (entryDate, voucherNo, type, channel, accountCode, activityCode, description, amount, taxAmount, taxKind, bankFee). */
export async function POST(req: NextRequest) {
  return attempt("POST /api/apbdes/bku", "Gagal mencatat transaksi", async () => {
    const guard = await requireVillageApiContext(req);
    if (!guard.ok) return guard.response;
    const { ctx } = guard;
    const body = await req.json().catch(() => null);
    const r = await addEntry(prisma, { villageId: ctx.village.id, userId: ctx.userId, input: body });
    if (!r.ok) return failResponse(r);
    const b = body as Record<string, unknown>;
    await auditWeb(req, ctx, "create", "apbdes_entries", r.data.id, { type: b.type, accountCode: b.accountCode, amount: b.amount, voucherNo: b.voucherNo });
    return NextResponse.json({ success: true, id: r.data.id }, { status: 201 });
  });
}
