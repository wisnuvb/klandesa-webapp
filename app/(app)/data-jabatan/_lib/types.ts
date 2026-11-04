export type Jabatan = {
  id: number;
  name: string;
  level: number;
  /** Unit organisasi eksplisit; null = disimpulkan dari nama/level. */
  unit?: string | null;
  description: string | null;
  salary: number | null;
  allowance: number | null;
  total_staff: number;
  isActive: boolean;
};

export const DATA_JABATAN_VIEW_TABS = ["table", "hierarchy"] as const;

export type DataJabatanViewTab = (typeof DATA_JABATAN_VIEW_TABS)[number];
