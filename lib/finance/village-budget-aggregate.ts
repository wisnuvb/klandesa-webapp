import type { Budget, Transaction } from "@prisma/client";
import type { VillageBudget } from "@/app/(app)/anggaran/_lib/types";

type BudgetRow = Pick<
  Budget,
  | "id"
  | "villageId"
  | "year"
  | "category"
  | "subCategory"
  | "budgetAmount"
  | "realizedAmount"
  | "remainingAmount"
  | "createdAt"
  | "updatedAt"
>;

type TransactionRow = Pick<
  Transaction,
  "type" | "category" | "amount" | "transactionDate"
>;

type SectorKey =
  | "employee"
  | "infrastructure"
  | "health"
  | "education"
  | "agriculture"
  | "social";

const SECTOR_PATTERNS: Record<SectorKey, RegExp[]> = {
  employee: [/pegawai/i, /pemerintahan desa/i, /siltap/i, /honor/i],
  infrastructure: [/infrastruktur/i, /pembangunan/i, /jalan/i, /jembatan/i, /irigasi/i],
  health: [/kesehatan/i, /posyandu/i, /sanitasi/i],
  education: [/pendidikan/i, /sekolah/i, /paud/i],
  agriculture: [/pertanian/i, /tani/i, /peternakan/i],
  social: [/sosial/i, /kemasyarakatan/i, /pemberdayaan/i, /bansos/i],
};

function matchSector(text: string): SectorKey | null {
  for (const [sector, patterns] of Object.entries(SECTOR_PATTERNS) as [
    SectorKey,
    RegExp[],
  ][]) {
    if (patterns.some((p) => p.test(text))) return sector;
  }
  return null;
}

function emptyYearBudget(villageId: number, year: number): VillageBudget {
  return {
    id: year,
    village_id: villageId,
    year,
    revenue: 0,
    government_fund: 0,
    district_fund: 0,
    province_fund: 0,
    local_income: 0,
    community_contribution: 0,
    private_sector_contribution: 0,
    total_expenditure: 0,
    infrastructure_realization: 0,
    health_realization: 0,
    education_realization: 0,
    agriculture_realization: 0,
    social_realization: 0,
    employee_realization: 0,
    employee_budget: 0,
    infrastructure_budget: 0,
    health_budget: 0,
    education_budget: 0,
    agriculture_budget: 0,
    social_budget: 0,
    remaining_budget: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function addSectorBudget(
  target: VillageBudget,
  sector: SectorKey,
  budget: number,
  realization: number,
) {
  switch (sector) {
    case "employee":
      target.employee_budget += budget;
      target.employee_realization += realization;
      break;
    case "infrastructure":
      target.infrastructure_budget += budget;
      target.infrastructure_realization += realization;
      break;
    case "health":
      target.health_budget += budget;
      target.health_realization += realization;
      break;
    case "education":
      target.education_budget += budget;
      target.education_realization += realization;
      break;
    case "agriculture":
      target.agriculture_budget += budget;
      target.agriculture_realization += realization;
      break;
    case "social":
      target.social_budget += budget;
      target.social_realization += realization;
      break;
  }
}

function classifyIncome(category: string, subCategory: string | null): keyof Pick<
  VillageBudget,
  | "government_fund"
  | "district_fund"
  | "province_fund"
  | "local_income"
  | "community_contribution"
  | "private_sector_contribution"
> {
  const text = `${category} ${subCategory ?? ""}`.toLowerCase();
  if (/dana desa|add|transfer pemerintah/i.test(text)) return "government_fund";
  if (/kabupaten|kecamatan/i.test(text)) return "district_fund";
  if (/provinsi/i.test(text)) return "province_fund";
  if (/swadaya|partisipasi|gotong/i.test(text)) return "community_contribution";
  if (/hibah|sumbangan|private|swasta/i.test(text)) return "private_sector_contribution";
  return "local_income";
}

/** Agregasi baris Budget + Transaction ke ringkasan tahunan untuk halaman Anggaran. */
export function aggregateVillageBudgets(
  villageId: number,
  budgets: BudgetRow[],
  transactions: TransactionRow[],
): VillageBudget[] {
  const byYear = new Map<number, VillageBudget>();

  for (const row of budgets) {
    const year = row.year;
    if (!byYear.has(year)) {
      byYear.set(year, emptyYearBudget(villageId, year));
    }
    const bucket = byYear.get(year)!;
    const budgetAmount = Number(row.budgetAmount);
    const realizedAmount = Number(row.realizedAmount);
    const label = `${row.category} ${row.subCategory ?? ""}`;
    const sector = matchSector(label);

    if (sector) {
      addSectorBudget(bucket, sector, budgetAmount, realizedAmount);
    } else {
      addSectorBudget(bucket, "social", budgetAmount, realizedAmount);
    }

    bucket.remaining_budget += Number(row.remainingAmount);
    bucket.updated_at = row.updatedAt.toISOString();
  }

  for (const tx of transactions) {
    if (tx.type !== "income") continue;
    const year = tx.transactionDate.getFullYear();
    if (!byYear.has(year)) {
      byYear.set(year, emptyYearBudget(villageId, year));
    }
    const bucket = byYear.get(year)!;
    const amount = Number(tx.amount);
    const field = classifyIncome(tx.category, null);
    bucket[field] += amount;
    bucket.revenue += amount;
  }

  for (const bucket of byYear.values()) {
    bucket.total_expenditure =
      bucket.employee_realization +
      bucket.infrastructure_realization +
      bucket.health_realization +
      bucket.education_realization +
      bucket.agriculture_realization +
      bucket.social_realization;

    if (bucket.revenue === 0) {
      bucket.revenue =
        bucket.government_fund +
        bucket.district_fund +
        bucket.province_fund +
        bucket.local_income +
        bucket.community_contribution +
        bucket.private_sector_contribution;
    }
  }

  return Array.from(byYear.values()).sort((a, b) => b.year - a.year);
}
