export const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

export const rupiah = (v: string | number): string => `Rp${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(v))}`;
export const day = (d: string | null): string => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "-");

export interface MemberBalance {
  id: number;
  name: string;
  membershipNumber: string | null;
  active: boolean;
  pokok: string;
  wajib: string;
  sukarela: string;
  total: string;
}
export interface SavingsResponse {
  members: MemberBalance[];
  totals: { pokok: string; wajib: string; sukarela: string; total: string };
  history: { total: number; items: { id: number; memberName: string; kind: string; direction: string; amount: string; txDate: string; note: string | null }[] };
  page: number;
  kinds: Record<string, string>;
  canManage: boolean;
}
export interface LoanRow {
  id: number;
  memberId: number;
  memberName: string;
  principal: string;
  ratePercent: string;
  termMonths: number;
  disbursedAt: string;
  purpose: string | null;
  status: string;
  totalDue: string;
  totalPaid: string;
  outstanding: string;
  nextDue: string | null;
  overdueCount: number;
}
