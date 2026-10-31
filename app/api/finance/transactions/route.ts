import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toJSONSafe } from "@/utils/json";
import {
  isVillageSubscriptionActive,
  subscriptionBlockedResponse,
} from "@/lib/subscription";
import { requireVillageApiContext } from "@/lib/api-village-context";
import { isAddonActive, keuanganLimit } from "@/lib/modules/resource-limits";
import { loadActiveModuleSubs } from "@/lib/modules/require-module";
import { auditWeb } from "@/lib/audit/web-audit";
import { diffRecord, pickSummary } from "@/lib/audit/diff";

const TX_AUDIT_KEYS = [
  "transactionNumber", "transactionDate", "type", "category", "description",
  "amount", "paymentMethod", "referenceNumber", "status",
] as const;

/** Tampilan aman untuk AuditLog: jumlah (Decimal) diubah ke angka agar bisa diserialisasi ke kolom Json. */
function txAuditView(t: { amount: unknown } & Record<string, unknown>) {
  return pickSummary({ ...t, amount: Number(t.amount) }, TX_AUDIT_KEYS);
}

function generateTransactionNumber(type: string, date: Date) {
  // Tanggal disimpan sebagai UTC 00:00, jadi tahun/bulan nomor juga dibaca dalam UTC.
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const random = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  const prefix = type === "income" ? "BKM" : "BKK";
  return `${prefix}-${year}-${month}-${random}`;
}

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;

    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const yearParam = req.nextUrl.searchParams.get("year");
    const typeParam = req.nextUrl.searchParams.get("type");
    const year = yearParam ? parseInt(yearParam, 10) : undefined;

    const where: {
      villageId: number;
      type?: string;
      transactionDate?: { gte: Date; lt: Date };
    } = { villageId: village.id };

    if (typeParam === "income" || typeParam === "expense") {
      where.type = typeParam;
    }

    if (Number.isFinite(year)) {
      where.transactionDate = {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${(year as number) + 1}-01-01`),
      };
    }

    const [addons, allRows] = await Promise.all([
      loadActiveModuleSubs(village.id),
      prisma.transaction.findMany({
        where,
        orderBy: [{ transactionDate: "desc" }, { id: "desc" }],
        take: 1000,
        select: {
          id: true,
          transactionNumber: true,
          transactionDate: true,
          type: true,
          category: true,
          description: true,
          amount: true,
          sdgGoalIds: true,
          status: true,
        },
      }),
    ]);

    const hasAddon = isAddonActive("keuangan", addons);
    const limit = keuanganLimit(village.subscriptionPlan, village.subscriptionStatus, hasAddon);
    const cap = limit?.transaksiPerYear ?? null;
    const isOverLimit = cap !== null && allRows.length > cap;
    const rows = cap !== null ? allRows.slice(0, cap) : allRows;

    return NextResponse.json({
      success: true,
      data: toJSONSafe(
        rows.map((r) => ({
          ...r,
          transactionDate: r.transactionDate.toISOString(),
        })),
      ),
      limit: cap,
      total: allRows.length,
      hiddenCount: isOverLimit ? allRows.length - cap! : 0,
      isOverLimit,
    });
  } catch (err) {
    console.error("GET /api/finance/transactions error:", err);
    return NextResponse.json(
      { error: "Gagal memuat transaksi" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village, userId } = loaded.ctx;

    const body = await req.json();
    const {
      type,
      category,
      description,
      amount,
      transactionDate,
      paymentMethod,
      referenceNumber,
      status,
    } = body;

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const categoryStr =
      typeof category === "string"
        ? category.trim()
        : String(category ?? "").trim();
    const descriptionStr =
      typeof description === "string"
        ? description.trim()
        : String(description ?? "").trim();

    if (
      !type ||
      !categoryStr ||
      !descriptionStr ||
      transactionDate === undefined ||
      transactionDate === null ||
      transactionDate === ""
    ) {
      return NextResponse.json(
        { error: "Field yang diperlukan tidak lengkap" },
        { status: 400 },
      );
    }

    if (type !== "income" && type !== "expense") {
      return NextResponse.json(
        { error: "Jenis transaksi harus income atau expense" },
        { status: 400 },
      );
    }

    const amt =
      typeof amount === "number"
        ? amount
        : parseFloat(String(amount ?? "").replace(",", "."));
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json(
        { error: "Jumlah harus berupa angka lebih dari 0" },
        { status: 400 },
      );
    }

    const date = new Date(transactionDate);
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json(
        { error: "Tanggal transaksi tidak valid" },
        { status: 400 },
      );
    }

    // Kuota "per tahun": hitung transaksi di tahun tanggal yang dicatat, bukan seluruh riwayat.
    const txYear = date.getUTCFullYear();
    const [addonsPost, currentCount] = await Promise.all([
      loadActiveModuleSubs(village.id),
      prisma.transaction.count({
        where: {
          villageId: village.id,
          transactionDate: {
            gte: new Date(`${txYear}-01-01T00:00:00.000Z`),
            lt: new Date(`${txYear + 1}-01-01T00:00:00.000Z`),
          },
        },
      }),
    ]);
    const postLimit = keuanganLimit(
      village.subscriptionPlan,
      village.subscriptionStatus,
      isAddonActive("keuangan", addonsPost),
    );
    if (postLimit !== null && currentCount >= postLimit.transaksiPerYear) {
      return NextResponse.json(
        {
          error: "RESOURCE_LIMIT_REACHED",
          message: `Batas ${postLimit.transaksiPerYear} transaksi untuk tahun ${txYear} sudah tercapai. Tingkatkan paket atau aktifkan add-on Keuangan di menu Langganan.`,
          limit: postLimit.transaksiPerYear,
          current: currentCount,
          module: "keuangan",
          billingUrl: "/billing?module=keuangan",
        },
        { status: 402 },
      );
    }

    // Klien hanya boleh mengajukan SPP (pending); selain itu langsung sah (verified).
    const initialStatus = status === "pending" ? "pending" : "verified";

    // Nomor memakai angka acak 4 digit pada kolom unik: ulangi bila bentrok.
    let transaction;
    for (let attempt = 0; ; attempt++) {
      const transactionNumber = generateTransactionNumber(type, date);
      try {
        transaction = await prisma.transaction.create({
          data: {
            villageId: village.id,
            transactionNumber,
            transactionDate: date,
            type,
            category: categoryStr,
            description: descriptionStr,
            amount: amt,
            paymentMethod: paymentMethod || "cash",
            referenceNumber: referenceNumber || transactionNumber,
            status: initialStatus,
            verifiedBy: userId,
          },
        });
        break;
      } catch (e) {
        const duplicate =
          e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
        if (!duplicate || attempt >= 4) throw e;
      }
    }

    await auditWeb(req, loaded.ctx, "create", "transactions", transaction.id, txAuditView(transaction));

    return NextResponse.json({
      success: true,
      data: toJSONSafe(transaction),
      message: "Transaksi berhasil dicatat",
    });
  } catch (err) {
    console.error("POST /api/finance/transactions error:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan transaksi" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const body = await req.json();
    const {
      id,
      type,
      category,
      description,
      amount,
      transactionDate,
      paymentMethod,
      referenceNumber,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID transaksi diperlukan" },
        { status: 400 },
      );
    }

    const existing = await prisma.transaction.findFirst({
      where: { id: BigInt(id), villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    const data: Prisma.TransactionUpdateInput = {};
    if (type !== undefined) {
      if (type !== "income" && type !== "expense") {
        return NextResponse.json({ error: "Jenis transaksi tidak valid" }, { status: 400 });
      }
      data.type = type;
    }
    if (category !== undefined) {
      const c = String(category).trim();
      if (!c) return NextResponse.json({ error: "Kategori tidak boleh kosong" }, { status: 400 });
      data.category = c;
    }
    if (description !== undefined) {
      const d = String(description).trim();
      if (!d) return NextResponse.json({ error: "Uraian tidak boleh kosong" }, { status: 400 });
      data.description = d;
    }
    if (amount !== undefined) {
      const a = typeof amount === "number" ? amount : parseFloat(String(amount).replace(",", "."));
      if (!Number.isFinite(a) || a <= 0) {
        return NextResponse.json({ error: "Jumlah harus berupa angka lebih dari 0" }, { status: 400 });
      }
      data.amount = a;
    }
    // Tanggal kosong = tidak diubah (klien lama mengirim "" bila kolom tanggal tidak terisi).
    if (transactionDate) {
      const d = new Date(transactionDate);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Tanggal transaksi tidak valid" }, { status: 400 });
      }
      data.transactionDate = d;
    }
    if (paymentMethod) data.paymentMethod = paymentMethod;
    if (referenceNumber) data.referenceNumber = referenceNumber;

    const transaction = await prisma.transaction.update({
      where: { id: existing.id },
      data,
    });

    await auditWeb(
      req,
      loaded.ctx,
      "update",
      "transactions",
      transaction.id,
      diffRecord(txAuditView(existing), txAuditView(transaction)),
    );

    return NextResponse.json({
      success: true,
      data: toJSONSafe(transaction),
      message: "Transaksi berhasil diupdate",
    });
  } catch (err) {
    console.error("PUT /api/finance/transactions error:", err);
    return NextResponse.json(
      { error: "Gagal mengupdate transaksi" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID transaksi diperlukan" },
        { status: 400 },
      );
    }

    const existing = await prisma.transaction.findFirst({
      where: { id: BigInt(id), villageId: village.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    await prisma.transaction.delete({
      where: { id: existing.id },
    });

    await auditWeb(req, loaded.ctx, "delete", "transactions", existing.id, txAuditView(existing));

    return NextResponse.json({
      success: true,
      message: "Transaksi berhasil dihapus",
    });
  } catch (err) {
    console.error("DELETE /api/finance/transactions error:", err);
    return NextResponse.json(
      { error: "Gagal menghapus transaksi" },
      { status: 500 },
    );
  }
}
