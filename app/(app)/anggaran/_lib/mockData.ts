import type { VillageBudget } from "./types";

/** @deprecated Data mock — halaman anggaran kini fetch `/api/finance/village-budgets`. */
export const mockData: VillageBudget[] = [
  {
    id: 1,
    village_id: 2,
    year: 2024,
    revenue: 1000000000,
    government_fund: 500000000,
    district_fund: 100000000,
    province_fund: 200000000,
    local_income: 300000000,
    community_contribution: 50000000,
    private_sector_contribution: 0,
    total_expenditure: 750000000,
    infrastructure_realization: 75000000,
    health_realization: 15000000,
    education_realization: 14000000,
    agriculture_realization: 65000000,
    social_realization: 45000000,
    employee_realization: 350000000,
    employee_budget: 500000000,
    infrastructure_budget: 250000000,
    health_budget: 200000000,
    education_budget: 75000000,
    agriculture_budget: 70000000,
    social_budget: 50000000,
    remaining_budget: 250000000,
    created_at: "2024-10-12 10:11:34",
    updated_at: "2024-10-12 10:11:34",
  },
];
