import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/auth";
import { toJSONSafe } from "@/utils/json";

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

interface FinanceResponse {
  apbdes: ApbdesData;
  pendapatan: PendapatanItem[];
  belanja: BelanjaItem[];
  transaksi: TransaksiKasItem[];
  spp: SPPItem[];
  trend: TrendItem[];
}

const CACHE_DURATION = 5 * 60 * 1000;
const cache = new Map<string, { data: FinanceResponse; timestamp: number }>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveVillage(session: any) {
  if (session?.user?.villageCode) {
    const v = await prisma.village.findUnique({
      where: { code: session.user.villageCode },
    });
    if (v) return v;
  }
  const defaultCode = process.env.DEFAULT_VILLAGE_CODE;
  if (defaultCode) {
    const v = await prisma.village.findUnique({ where: { code: defaultCode } });
    if (v) return v;
  }
  return prisma.village.findFirst({ orderBy: { id: "asc" } });
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
    const session = await getServerSession(authOptions);
    const village = await resolveVillage(session);
    if (!village) {
      return NextResponse.json(
        { error: "Tidak ada desa yang tersedia" },
        { status: 404 }
      );
    }

    const url = new URL(req.url);
    const year = parseInt(
      url.searchParams.get("year") ?? `${new Date().getFullYear()}`,
      10
    );

    const cacheKey = `finance-${village.id}-${year}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: toJSONSafe(cached.data),
        cached: true,
      });
    }

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

    // Get transactions for fallback data
    const startYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endYear = new Date(`${year}-12-31T23:59:59.999Z`);

    const allTransactions = await prisma.transaction.findMany({
      where: {
        villageId: village.id,
        transactionDate: { gte: startYear, lte: endYear },
      },
      select: {
        type: true,
        category: true,
        amount: true,
      },
    });

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
    const apbdes: ApbdesData = {
      tahun: year,
      totalPendapatan:
        totalPend.budget > 0 ? totalPend.budget : incomeFromTrans,
      totalBelanja: totalBel.budget > 0 ? totalBel.budget : expenseFromTrans,
      realisasiPendapatan:
        totalPend.realized > 0 ? totalPend.realized : incomeFromTrans,
      realisasiBelanja:
        totalBel.realized > 0 ? totalBel.realized : expenseFromTrans,
      budgetPendapatan:
        totalPend.budget > 0 ? totalPend.budget : incomeFromTrans,
      budgetBelanja: totalBel.budget > 0 ? totalBel.budget : expenseFromTrans,
    };

    // Build pendapatan items grouped by category, with subKategori from subCategory
    const pendapatanMap = new Map<
      string,
      {
        anggaran: number;
        realisasi: number;
        subs: Map<string, { anggaran: number; realisasi: number }>;
      }
    >();

    for (const b of pendapatanBudgets) {
      const cat = (b.category || "Pendapatan").trim();
      const subCat = (b.subCategory || "Lainnya").trim();

      if (!pendapatanMap.has(cat)) {
        pendapatanMap.set(cat, {
          anggaran: 0,
          realisasi: 0,
          subs: new Map(),
        });
      }
      const entry = pendapatanMap.get(cat)!;
      entry.anggaran += Number(b.budgetAmount ?? 0);
      entry.realisasi += Number(b.realizedAmount ?? 0);

      const subPrev = entry.subs.get(subCat) || { anggaran: 0, realisasi: 0 };
      entry.subs.set(subCat, {
        anggaran: subPrev.anggaran + Number(b.budgetAmount ?? 0),
        realisasi: subPrev.realisasi + Number(b.realizedAmount ?? 0),
      });
    }

    // If no budgets, create from transactions
    if (pendapatanBudgets.length === 0 && incomeFromTrans > 0) {
      const incomeByCategory = new Map<string, number>();
      allTransactions
        .filter((t) => t.type === "income")
        .forEach((t) => {
          const cat = t.category || "Pendapatan Lainnya";
          incomeByCategory.set(
            cat,
            (incomeByCategory.get(cat) || 0) + Number(t.amount ?? 0)
          );
        });

      incomeByCategory.forEach((amount, cat) => {
        pendapatanMap.set(cat, {
          anggaran: amount,
          realisasi: amount,
          subs: new Map([
            ["Realisasi", { anggaran: amount, realisasi: amount }],
          ]),
        });
      });
    }

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

    // Build belanja items grouped by category, with subItems from subCategory
    const belanjaMap = new Map<
      string,
      {
        anggaran: number;
        realisasi: number;
        subs: Map<string, { anggaran: number; realisasi: number }>;
      }
    >();

    for (const b of belanjaBudgets) {
      const cat = (b.category || "Belanja").trim();
      const subCat = (b.subCategory || "Lainnya").trim();

      if (!belanjaMap.has(cat)) {
        belanjaMap.set(cat, {
          anggaran: 0,
          realisasi: 0,
          subs: new Map(),
        });
      }
      const entry = belanjaMap.get(cat)!;
      entry.anggaran += Number(b.budgetAmount ?? 0);
      entry.realisasi += Number(b.realizedAmount ?? 0);

      const subPrev = entry.subs.get(subCat) || { anggaran: 0, realisasi: 0 };
      entry.subs.set(subCat, {
        anggaran: subPrev.anggaran + Number(b.budgetAmount ?? 0),
        realisasi: subPrev.realisasi + Number(b.realizedAmount ?? 0),
      });
    }

    // If no budgets, create from transactions
    if (belanjaBudgets.length === 0 && expenseFromTrans > 0) {
      const expenseByCategory = new Map<string, number>();
      allTransactions
        .filter((t) => t.type === "expense")
        .forEach((t) => {
          const cat = t.category || "Belanja Lainnya";
          expenseByCategory.set(
            cat,
            (expenseByCategory.get(cat) || 0) + Number(t.amount ?? 0)
          );
        });

      expenseByCategory.forEach((amount, cat) => {
        belanjaMap.set(cat, {
          anggaran: amount,
          realisasi: amount,
          subs: new Map([
            ["Realisasi", { anggaran: amount, realisasi: amount }],
          ]),
        });
      });
    }

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

    // Transactions for year (reuse allTransactions but get full details)
    const transactions = await prisma.transaction.findMany({
      where: {
        villageId: village.id,
        transactionDate: { gte: startYear, lte: endYear },
      },
      orderBy: { transactionDate: "asc" },
      take: 100,
      select: {
        id: true,
        transactionNumber: true,
        transactionDate: true,
        description: true,
        type: true,
        amount: true,
        status: true,
        category: true,
      },
    });

    // Calculate running saldo
    let runningSaldo = 0;
    const transaksi: TransaksiKasItem[] = transactions.map((t) => {
      const amount = Number(t.amount ?? 0);
      if (t.type === "income") {
        runningSaldo += amount;
      } else {
        runningSaldo -= amount;
      }
      return {
        id: Number(t.id),
        tanggal: t.transactionDate.toISOString(),
        kode: t.transactionNumber,
        uraian: t.description,
        jenis: t.type === "income" ? "masuk" : "keluar",
        jumlah: amount,
        saldo: runningSaldo,
        status: t.status,
      };
    });

    // Reverse to show newest first
    transaksi.reverse();

    // SPP derived from pending expense transactions
    const spp: SPPItem[] = transactions
      .filter((t) => t.type === "expense")
      .map((t) => ({
        id: Number(t.id),
        nomor: t.transactionNumber,
        tanggal: t.transactionDate.toISOString(),
        keperluan: t.description,
        bidang: t.category,
        jumlah: Number(t.amount ?? 0),
        status: t.status,
        pengaju: "Bendahara Desa",
      }));

    // Trend: last 6 months totals
    const last6Months: Date[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push(d);
    }

    const trend: TrendItem[] = [];
    for (const d of last6Months) {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(
        d.getFullYear(),
        d.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );
      const monthTrans = await prisma.transaction.findMany({
        where: {
          villageId: village.id,
          transactionDate: { gte: start, lte: end },
        },
        select: { type: true, amount: true },
      });
      const pendapatan = monthTrans
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + Number(t.amount ?? 0), 0);
      const belanjaTotal = monthTrans
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + Number(t.amount ?? 0), 0);
      trend.push({
        bulan: monthName(start.getMonth()),
        pendapatan,
        belanja: belanjaTotal,
      });
    }

    const data: FinanceResponse = {
      apbdes,
      pendapatan,
      belanja,
      transaksi,
      spp,
      trend,
    };
    cache.set(cacheKey, { data, timestamp: Date.now() });

    return NextResponse.json({
      success: true,
      data: toJSONSafe(data),
      cached: false,
    });
  } catch (err) {
    console.error("GET /api/finance/summary error:", err);
    return NextResponse.json(
      { error: "Gagal mengambil data keuangan" },
      { status: 500 }
    );
  }
}
