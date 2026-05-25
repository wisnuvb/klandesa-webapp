export type BumdesProfile = {
  id: number;
  villageId: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  legalNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BumdesStats = {
  unitCount: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
};

export type BumdesSummaryResponse = {
  bumdes: BumdesProfile | null;
  stats: BumdesStats | null;
  canManage: boolean;
  canRead: boolean;
  needsBootstrap: boolean;
};

export type BumdesUnitRow = {
  id: number;
  bumdesId: number;
  name: string;
  category: string | null;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { transactions: number };
  totalIncome?: number;
  totalExpense?: number;
  netProfit?: number;
};

export type BumdesTransactionRow = {
  id: number;
  bumdesId: number;
  unitId: number;
  entryDate: string;
  direction: "income" | "expense";
  amount: number | string;
  category: string;
  description: string | null;
  createdAt: string;
  unit?: { id: number; name: string; category: string | null };
  createdUser?: { id: number; name: string } | null;
};

export type BumdesSummaryDetail = {
  overall: BumdesStats;
  units: BumdesUnitRow[];
};
