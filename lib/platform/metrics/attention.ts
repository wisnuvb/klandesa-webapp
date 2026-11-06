/** "Perlu perhatian": daftar kerja ringkas owner. Pembangun daftar murni; pengambil data di bawah. */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { invoiceStatusWhere } from "@/lib/billing/invoice-filters";
import { daysUntil, toNum } from "./aggregate";
import { formatDaysLeft, formatRupiah } from "./format";
import { DAY_MS } from "./period";
import { productLabel } from "./invoices";

export type AttentionSeverity = "urgent" | "warning" | "info";
export type AttentionEntry = { label: string; detail: string; href: string };
export type AttentionItem = {
  key: "expiring_7d" | "trial_ending_3d" | "pending_invoices" | "partner_applications" | "disbursements_waiting";
  severity: AttentionSeverity;
  title: string;
  count: number;
  hint: string;
  href: string;
  entries: AttentionEntry[];
};

export type AttentionRaw = {
  expiring7d: { total: number; sample: Array<{ id: number; name: string; expiry: Date }> };
  trialEnding3d: { total: number; sample: Array<{ id: number; name: string; expiry: Date }> };
  pendingOld: { total: number; amount: number; sample: Array<{ villageId: number; villageName: string; invoiceNumber: string; productType: string; amount: number; createdAt: Date }> };
  applicationsNew: number;
  disbursementsWaiting: { count: number; amount: number };
};

export const ATTENTION_SAMPLE = 5;
export const PENDING_INVOICE_DAYS = 3;
export const TRIAL_ENDING_DAYS = 3;
export const EXPIRING_DAYS = 7;

/** Hanya item yang punya pekerjaan (count > 0) yang dikembalikan; urut dari paling mendesak. */
export function buildAttention(raw: AttentionRaw, now: Date): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (raw.expiring7d.total > 0) {
    items.push({
      key: "expiring_7d", severity: "urgent", title: "Langganan segera berakhir", count: raw.expiring7d.total,
      hint: `Desa berlangganan yang habis dalam ${EXPIRING_DAYS} hari. Hubungi sebelum akses terkunci.`, href: "/admin/desa",
      entries: raw.expiring7d.sample.map((v) => ({ label: v.name, detail: `Berakhir ${formatDaysLeft(daysUntil(v.expiry, now))}`, href: `/admin/desa/${v.id}` })),
    });
  }
  if (raw.trialEnding3d.total > 0) {
    items.push({
      key: "trial_ending_3d", severity: "urgent", title: "Trial berakhir ≤ 3 hari", count: raw.trialEnding3d.total,
      hint: "Kesempatan terakhir mengarahkan desa trial ke pembayaran.", href: "/admin/desa",
      entries: raw.trialEnding3d.sample.map((v) => ({ label: v.name, detail: `Trial berakhir ${formatDaysLeft(daysUntil(v.expiry, now))}`, href: `/admin/desa/${v.id}` })),
    });
  }
  if (raw.pendingOld.total > 0) {
    items.push({
      key: "pending_invoices", severity: "warning", title: `Tagihan menunggu > ${PENDING_INVOICE_DAYS} hari`, count: raw.pendingOld.total,
      hint: `Total nilai ${formatRupiah(raw.pendingOld.amount)} belum dibayar.`, href: "/admin/pendapatan?status=pending",
      entries: raw.pendingOld.sample.map((p) => ({
        label: p.villageName,
        detail: `${productLabel(p.productType)} · ${formatRupiah(p.amount)} · ${Math.max(1, Math.floor((now.getTime() - p.createdAt.getTime()) / DAY_MS))} hari`,
        href: `/admin/desa/${p.villageId}`,
      })),
    });
  }
  if (raw.applicationsNew > 0) {
    items.push({
      key: "partner_applications", severity: "info", title: "Pendaftaran mitra baru", count: raw.applicationsNew,
      hint: "Menunggu ditinjau.", href: "/admin/mitra", entries: [],
    });
  }
  if (raw.disbursementsWaiting.count > 0) {
    items.push({
      key: "disbursements_waiting", severity: "warning", title: "Pencairan komisi menunggu", count: raw.disbursementsWaiting.count,
      hint: `Total ${formatRupiah(raw.disbursementsWaiting.amount)} belum dibayarkan ke mitra.`, href: "/admin/mitra", entries: [],
    });
  }
  const rank: Record<AttentionSeverity, number> = { urgent: 0, warning: 1, info: 2 };
  return items.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

export async function fetchAttentionRaw(now: Date): Promise<AttentionRaw> {
  const in7 = new Date(now.getTime() + EXPIRING_DAYS * DAY_MS);
  const in3 = new Date(now.getTime() + TRIAL_ENDING_DAYS * DAY_MS);
  const oldCut = new Date(now.getTime() - PENDING_INVOICE_DAYS * DAY_MS);
  const expWhere = { isActive: true, subscriptionStatus: "active", subscriptionExpiry: { gt: now, lte: in7 } } satisfies Prisma.VillageWhereInput;
  const trialWhere = { isActive: true, subscriptionStatus: "trial", subscriptionExpiry: { gt: now, lte: in3 } } satisfies Prisma.VillageWhereInput;
  const pendingWhere: Prisma.BillingInvoiceWhereInput = { AND: [invoiceStatusWhere("pending", now), { createdAt: { lt: oldCut } }] };

  const [expTotal, expSample, trialTotal, trialSample, pendAgg, pendSample, applicationsNew, disb] = await Promise.all([
    prisma.village.count({ where: expWhere }),
    prisma.village.findMany({ where: expWhere, orderBy: { subscriptionExpiry: "asc" }, take: ATTENTION_SAMPLE, select: { id: true, name: true, subscriptionExpiry: true } }),
    prisma.village.count({ where: trialWhere }),
    prisma.village.findMany({ where: trialWhere, orderBy: { subscriptionExpiry: "asc" }, take: ATTENTION_SAMPLE, select: { id: true, name: true, subscriptionExpiry: true } }),
    prisma.billingInvoice.aggregate({ where: pendingWhere, _sum: { amount: true }, _count: { _all: true } }),
    prisma.billingInvoice.findMany({
      where: pendingWhere, orderBy: { createdAt: "asc" }, take: ATTENTION_SAMPLE,
      select: { villageId: true, invoiceNumber: true, productType: true, amount: true, createdAt: true, village: { select: { name: true } } },
    }),
    prisma.partnerApplication.count({ where: { status: "NEW" } }),
    prisma.partnerDisbursement.aggregate({ where: { status: { in: ["pending", "processing"] } }, _sum: { amount: true }, _count: { _all: true } }),
  ]);

  return {
    expiring7d: { total: expTotal, sample: expSample.map((v) => ({ id: v.id, name: v.name, expiry: v.subscriptionExpiry as Date })) },
    trialEnding3d: { total: trialTotal, sample: trialSample.map((v) => ({ id: v.id, name: v.name, expiry: v.subscriptionExpiry as Date })) },
    pendingOld: {
      total: pendAgg._count._all, amount: toNum(pendAgg._sum.amount),
      sample: pendSample.map((p) => ({ villageId: p.villageId, villageName: p.village.name, invoiceNumber: p.invoiceNumber, productType: p.productType, amount: toNum(p.amount), createdAt: p.createdAt })),
    },
    applicationsNew,
    disbursementsWaiting: { count: disb._count._all, amount: toNum(disb._sum.amount) },
  };
}

export async function computeAttention(now: Date): Promise<AttentionItem[]> {
  return buildAttention(await fetchAttentionRaw(now), now);
}
