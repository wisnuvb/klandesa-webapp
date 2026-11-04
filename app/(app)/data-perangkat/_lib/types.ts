export type Position = {
  id: number;
  name: string;
  level: number;
  /** Unit organisasi eksplisit; null = disimpulkan dari nama/level (lib/officials/org.ts). */
  unit?: string | null;
};

export type AccountState = "none" | "pending" | "active" | "inactive";

export type OfficialRow = {
  id: number;
  name: string;
  nik: string;
  supervisorId?: number | null;
  coordinatorId?: number | null;
  photoUrl?: string | null;
  email: string | null;
  phone: string | null;
  gender: "M" | "F";
  birthplace: string;
  birthDate: string | null;
  address: string;
  status: string;
  education: string | null;
  position: Position | null;
  hasAccount?: boolean;
  accountState?: AccountState;
};

export type EditFormState = {
  name: string;
  phone: string;
  email: string;
  status: "ACTIVE" | "INACTIVE";
  positionId: string;
  supervisorId: "none" | string;
  coordinatorId: "none" | string;
  address: string;
};

export const DATA_PERANGKAT_VIEW_TABS = ["table", "hierarchy"] as const;
export type DataPerangkatViewTab = (typeof DATA_PERANGKAT_VIEW_TABS)[number];
