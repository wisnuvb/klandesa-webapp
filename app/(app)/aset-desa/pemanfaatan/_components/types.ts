import type { AgreementDetail, AgreementView, LandOverview, LandRow } from "@/lib/aset-desa/land-service";

export type { AgreementDetail, AgreementView, LandOverview, LandRow };

export interface AgreementRow extends AgreementView {
  openCharges: number;
  receivedCharges: number;
  receivedTotal: string;
  openTotal: string;
}

export interface Terms {
  kinds: Record<string, { label: string; maxYears: number; needsRegencyPermit: boolean; basis: string; chargeLabel: string }>;
  status: Record<string, string>;
  periodUnits: Record<string, string>;
  lesseeKinds: Record<string, string>;
  docKinds: Record<string, string>;
  accounts: { code: string; name: string }[];
}

export interface AgreementsResponse {
  items: AgreementRow[];
  total: number;
  page: number;
  pageSize: number;
  can: { create: boolean; update: boolean; delete: boolean; receive: boolean; revert: boolean };
  terms: Terms;
}

export interface LandResponse {
  items: LandRow[];
  total: number;
  page: number;
  pageSize: number;
  can: { create: boolean; update: boolean };
  terms: { rightKinds: Record<string, string>; usages: Record<string, string> };
}

export interface ObjectOption {
  id: number;
  name: string;
  categoryLabel: string;
  areaSqm: string | null;
  defaultAccount: string;
  needsAppraisal: boolean;
}

export const rupiah = (v: string | number): string => `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(v))}`;
export const sqm = (v: string | number | null): string => (v === null ? "belum tercatat" : `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(Number(v))} m2`);
export const dateId = (iso: string | null): string => {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][m - 1]} ${y}`;
};
export const SELECT_CLASS =
  "flex h-11 w-full rounded-md border border-input bg-input-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";
