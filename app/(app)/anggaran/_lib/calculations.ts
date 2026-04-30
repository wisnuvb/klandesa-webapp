import type { VillageBudget } from "./types";

export function getUniqueYears(data: VillageBudget[]) {
  return Array.from(new Set(data.map((b) => b.year))).sort((a, b) => b - a);
}

export function getLatestBudgetByYear(data: VillageBudget[], years: number[]) {
  const latestYear = years[0];
  if (!latestYear) return null;
  return data.find((b) => b.year === latestYear) ?? null;
}

export function getTotalRealization(budget: VillageBudget | null) {
  if (!budget) return 0;
  return (
    budget.employee_realization +
    budget.infrastructure_realization +
    budget.health_realization +
    budget.education_realization +
    budget.agriculture_realization +
    budget.social_realization
  );
}

export function getTotalBudget(budget: VillageBudget | null) {
  if (!budget) return 0;
  return (
    budget.employee_budget +
    budget.infrastructure_budget +
    budget.health_budget +
    budget.education_budget +
    budget.agriculture_budget +
    budget.social_budget
  );
}

export function getPercentage(realization: number, budget: number) {
  return budget > 0 ? (realization / budget) * 100 : 0;
}

export function getRowTotals(budget: VillageBudget) {
  const totalBudgetRow =
    budget.employee_budget +
    budget.infrastructure_budget +
    budget.health_budget +
    budget.education_budget +
    budget.agriculture_budget +
    budget.social_budget;
  const totalRealizationRow =
    budget.employee_realization +
    budget.infrastructure_realization +
    budget.health_realization +
    budget.education_realization +
    budget.agriculture_realization +
    budget.social_realization;
  const percentageRow = getPercentage(totalRealizationRow, totalBudgetRow);

  return { totalBudgetRow, totalRealizationRow, percentageRow };
}
