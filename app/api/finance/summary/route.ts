import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toJSONSafe } from "@/utils/json";
import { isVillageSubscriptionActive, subscriptionBlockedResponse } from "@/lib/subscription";
import { requireVillageApiContext } from "@/lib/api-village-context";
import {
  isCountedTransactionStatus,
  isSppFlowStatus,
} from "@/lib/finance/transaction-status";
import { classifyExpense, classifyIncome } from "@/lib/finance/taxonomy";
import {
  budgetsToGroups,
  groupTransactions,
  mergeRealisasi,
} from "@/lib/finance/summary-groups";

/** Batas baris yang dikirim ke tabel (terbaru dulu). Total & saldo tetap dihitung dari SEMUA transaksi. */
const MAX_LIST_ROWS = 500;

interface ApbdesData {
  tahun: number;
  totalPendapatan: number;
  totalBelanja: number;
  realisasiPendapatan: number;
  realisasiBelanja: number;
  budgetPendapatan?: number;
  budgetBelanja?: number;
}

interface PendapatanItem {
  kategori: string;
  anggaran: number;
  realisasi: number;
  persentase: number;
  subKategori?: Array<{ nama: string; anggaran: number; realisasi: number }>;
}

interface BelanjaItem {
  bidang: string;
  anggaran: number;
  realisasi: number;
  persentase: number;
  color?: string;
  subItems?: Array<{
    nama: string;
    anggaran: number;
    realisasi: number;
    persentase: number;
  }>;
}

interface TransaksiKasItem {
  id: number;
  tanggal: string;
  kode: string;
  /** Nomor bukti/SPP yang diinput pengguna (default = kode). */
  referensi: string;
  uraian: string;
  jenis: "masuk" | "keluar";
  jumlah: number;
  saldo: number;
  status: string;
}

interface SPPItem {
  id: number;
  nomor: string;
  tanggal: string;
  keperluan: string;
  bidang: string;
  jumlah: number;
  status: string;
  pengaju: string;
}

interface TrendItem {
  bulan: string;
  pendapatan: number;
  belanja: number;
}

interface KasSummary {
  totalPemasukan: number;
  totalPengeluaran: number;
  saldo: number;
  jumlahTransaksi: number;
  terpotong: boolean;
}

interface SppStatusCount {
  approved: number;
  pending: number;
  rejected: number;
  total: number;
}

interface FinanceResponse {
  apbdes: ApbdesData;
  kas: KasSummary;
  sppStatus: SppStatusCount;
  pendapatan: PendapatanItem[];
  belanja: BelanjaItem[];
  transaksi: TransaksiKasItem[];
  spp: SPPItem[];
  trend: TrendItem[];
}

function monthName(i: number) {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  return months[i];
}

export async function GET(req: NextRequest) {
  try {
    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;
    if (!isVillageSubscriptionActive(village)) {
      return subscriptionBlockedResponse(village);
    }

    const url = new URL(req.url);
    const year = parseInt(
      url.searchParams.get("year") ?? `${new Date().getFullYear()}`,
      10
    );

    // Budgets for year
    const budgets = await prisma.budget.findMany({
      where: { villageId: village.id, year, status: "active" },
      select: {
        category: true,
        subCategory: true,
        budgetAmount: true,
        realizedAmount: true,
      },
    });

    // Semua transaksi tahun ini (tanggal disimpan sebagai UTC 00:00, jadi batas tahun juga UTC).
    const startYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endYear = new Date(`${year}-12-31T23:59:59.999Z`);

    const allRows = await prisma.transaction.findMany({
      where: {
        villageId: village.id,
        transactionDate: { gte: startYear, lte: endYear },
      },
      orderBy: [{ transactionDate: "asc" }, { id: "asc" }],
      select: {
        id: true,
        transactionNumber: true,
        referenceNumber: true,
        transactionDate: true,
        description: true,
        type: true,
        amount: true,
        status: true,
        category: true,
      },
    });

    // Realisasi, tren, dan saldo hanya dari transaksi yang benar-benar terjadi
    // (SPP pending/ditolak tidak ikut).
    const allTransactions = allRows.filter((t) =>
      isCountedTransactionStatus(t.status),
    );

    // Calculate totals from transactions
    const incomeFromTrans = allTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount ?? 0), 0);
    const expenseFromTrans = allTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount ?? 0), 0);

    // Group budgets
    const pendapatanBudgets = budgets.filter((b) =>
      /pendapatan/i.test(b.category)
    );
    const belanjaBudgets = budgets.filter(
      (b) => !/pendapatan/i.test(b.category)
    );

    const sumAmounts = (items: typeof budgets) =>
      items.reduce(
        (acc, b) => {
          acc.budget += Number(b.budgetAmount ?? 0);
          acc.realized += Number(b.realizedAmount ?? 0);
          return acc;
        },
        { budget: 0, realized: 0 }
      );

    const totalPend = sumAmounts(pendapatanBudgets);
    const totalBel = sumAmounts(belanjaBudgets);

    // Use transactions data if no budgets exist
    // Realisasi mengikuti total transaksi tahun ini (kas), selaras dengan grafik & buku kas.
    // Anggaran APBDes tetap dari budget jika ada.
    const apbdes: ApbdesData = {
      tahun: year,
      totalPendapatan:
        totalPend.budget > 0 ? totalPend.budget : incomeFromTrans,
      totalBelanja: totalBel.budget > 0 ? totalBel.budget : expenseFromTrans,
      realisasiPendapatan: incomeFromTrans,
      realisasiBelanja: expenseFromTrans,
      budgetPendapatan:
        totalPend.budget > 0 ? totalPend.budget : incomeFromTrans,
      budgetBelanja: totalBel.budget > 0 ? totalBel.budget : expenseFromTrans,
    };

    // Trend per bulan dalam tahun yang dipilih (bukan rolling 6 bulan dari "hari ini")
    const monthlyIncome = Array.from({ length: 12 }, () => 0);
    const monthlyExpense = Array.from({ length: 12 }, () => 0);
    for (const t of allTransactions) {
      const d = new Date(t.transactionDate);
      if (d.getUTCFullYear() !== year) continue;
      const m = d.getUTCMonth();
      const amt = Number(t.amount ?? 0);
      if (t.type === "income") monthlyIncome[m] += amt;
      else if (t.type === "expense") monthlyExpense[m] += amt;
    }
    const trendFromYear: TrendItem[] = [];
    for (let month = 0; month < 12; month++) {
      trendFromYear.push({
        bulan: monthName(month),
        pendapatan: monthlyIncome[month],
        belanja: monthlyExpense[month],
      });
    }

    // Pendapatan: anggaran dari Budget, realisasi dari transaksi kas yang sah.
    // Kategori dari dialog "Catat Transaksi" dipetakan ke kelompok yang sama dengan "Catat Pendapatan".
    const pendapatanMap = budgetsToGroups(pendapatanBudgets, "Pendapatan");
    mergeRealisasi(
      pendapatanMap,
      groupTransactions(
        allTransactions
          .filter((t) => t.type === "income")
          .map((t) => {
            const c = classifyIncome(t.category, t.description);
            return { amount: t.amount, group: c.kategori, sub: c.sub };
          }),
      ),
      pendapatanBudgets.length > 0,
    );

    const pendapatan: PendapatanItem[] = Array.from(
      pendapatanMap.entries()
    ).map(([kategori, v]) => ({
      kategori,
      anggaran: v.anggaran,
      realisasi: v.realisasi,
      persentase: v.anggaran > 0 ? (v.realisasi / v.anggaran) * 100 : 100,
      subKategori: Array.from(v.subs.entries()).map(([nama, sub]) => ({
        nama,
        anggaran: sub.anggaran,
        realisasi: sub.realisasi,
      })),
    }));

    // Belanja: sama — transaksi keluar digabung ke bidang anggaran (juga saat APBDes ada).
    const belanjaMap = budgetsToGroups(belanjaBudgets, "Belanja");
    mergeRealisasi(
      belanjaMap,
      groupTransactions(
        allTransactions
          .filter((t) => t.type === "expense")
          .map((t) => {
            const c = classifyExpense(t.category, t.description);
            return { amount: t.amount, group: c.bidang, sub: c.sub };
          }),
      ),
      belanjaBudgets.length > 0,
    );

    const COLORS = [
      "#0f766e",
      "#14b8a6",
      "#2dd4bf",
      "#5eead4",
      "#99f6e4",
      "#22c55e",
      "#f59e0b",
      "#ef4444",
    ];
    const belanja: BelanjaItem[] = Array.from(belanjaMap.entries()).map(
      ([bidang, v], idx) => ({
        bidang,
        anggaran: v.anggaran,
        realisasi: v.realisasi,
        persentase: v.anggaran > 0 ? (v.realisasi / v.anggaran) * 100 : 100,
        color: COLORS[idx % COLORS.length],
        subItems: Array.from(v.subs.entries()).map(([nama, sub]) => ({
          nama,
          anggaran: sub.anggaran,
          realisasi: sub.realisasi,
          persentase:
            sub.anggaran > 0 ? (sub.realisasi / sub.anggaran) * 100 : 100,
        })),
      })
    );

    // Saldo berjalan dihitung dari seluruh transaksi tahun ini; baris pending/ditolak tidak mengubah saldo.
    let runningSaldo = 0;
    const withSaldo: TransaksiKasItem[] = allRows.map((t) => {
      const amount = Number(t.amount ?? 0);
      if (isCountedTransactionStatus(t.status)) {
        runningSaldo += t.type === "income" ? amount : -amount;
      }
      return {
        id: Number(t.id),
        tanggal: t.transactionDate.toISOString(),
        kode: t.transactionNumber,
        referensi: t.referenceNumber || t.transactionNumber,
        uraian: t.description,
        jenis: t.type === "income" ? "masuk" : "keluar",
        jumlah: amount,
        saldo: runningSaldo,
        status: t.status,
      };
    });

    // Terbaru dulu
    const transaksi = withSaldo.slice().reverse().slice(0, MAX_LIST_ROWS);

    const kas: KasSummary = {
      totalPemasukan: incomeFromTrans,
      totalPengeluaran: expenseFromTrans,
      saldo: runningSaldo,
      jumlahTransaksi: allRows.length,
      terpotong: allRows.length > MAX_LIST_ROWS,
    };

    // SPP = belanja yang melewati alur persetujuan (pending/approved/rejected), terbaru dulu.
    const sppRows = allRows.filter(
      (t) => t.type === "expense" && isSppFlowStatus(t.status),
    );
    const sppStatus: SppStatusCount = {
      approved: sppRows.filter((t) => t.status === "approved").length,
      pending: sppRows.filter((t) => t.status === "pending").length,
      rejected: sppRows.filter((t) => t.status === "rejected").length,
      total: sppRows.length,
    };
    const spp: SPPItem[] = sppRows
      .slice()
      .reverse()
      .slice(0, MAX_LIST_ROWS)
      .map((t) => ({
        id: Number(t.id),
        nomor: t.referenceNumber || t.transactionNumber,
        tanggal: t.transactionDate.toISOString(),
        keperluan: t.description,
        bidang: t.category,
        jumlah: Number(t.amount ?? 0),
        status: t.status,
        pengaju: "Bendahara Desa",
      }));

    const data: FinanceResponse = {
      apbdes,
      kas,
      sppStatus,
      pendapatan,
      belanja,
      transaksi,
      spp,
      trend: trendFromYear,
    };

    return NextResponse.json({
      success: true,
      data: toJSONSafe(data),
    });
  } catch (err) {
    console.error("GET /api/finance/summary error:", err);
    return NextResponse.json(
      { error: "Gagal mengambil data keuangan" },
      { status: 500 }
    );
  }
}
