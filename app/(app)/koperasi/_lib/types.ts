export type CoopAccessResponse = {
  cooperativeId: number | null;
  hasCooperative: boolean;
  cooperative: { id: number; name: string } | null;
  membership: {
    id: number;
    coopAppRole: string;
    boardTitle: string | null;
  } | null;
  showCoopMenu: boolean;
  canRead: boolean;
  canManage: boolean;
  accessKind: string | null;
};

export type CoopSummaryResponse = {
  cooperative: Record<string, unknown> | null;
  stats: {
    memberCount: number;
    totalIncome: number;
    totalExpense: number;
    balance: number;
  } | null;
  canManage: boolean;
  canRead: boolean;
  needsBootstrap: boolean;
};

export type CoopMemberRow = {
  id: number;
  name: string;
  nik: string | null;
  membershipNumber: string | null;
  joinedAt: string;
  status: string;
  coopAppRole: string;
  boardTitle: string | null;
  notes: string | null;
  linkedUserId: number | null;
  linkedUser: { id: number; name: string; email: string | null } | null;
  resident: { id: number; name: string; nik: string } | null;
};

export type CoopLedgerRow = {
  id: number;
  entryDate: string;
  direction: string;
  amount: unknown;
  category: string;
  description: string | null;
  createdBy: number;
  createdUser: { id: number; name: string | null };
};

export type LinkUserOption = {
  id: number;
  name: string;
  email: string;
  role: string;
};
