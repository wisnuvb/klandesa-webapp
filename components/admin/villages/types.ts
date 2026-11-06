/** Tipe & pembantu tampilan Desa 360 (klien). Bentuk sama dengan respons GET /api/admin/villages/[id]. */

export type Phase = "trial" | "grace" | "active" | "inactive";

export type VillageDetail = {
  village: {
    id: number; code: string; name: string; district: string; regency: string; province: string;
    website: string | null; emailMasked: string | null; isActive: boolean; createdAt: string; onboardingCompletedAt: string | null;
  };
  subscription: {
    plan: string; status: string; phase: Phase; readable: boolean; writable: boolean; daysRemaining: number | null;
    startedAt: string | null; expiry: string | null; gpsAddon: { active: boolean; expiry: string | null };
  };
  storage: { limitGb: number; usedGb: number; percent: number };
  acquisition: { partnerId: number | null; partnerName: string | null; acquiredAt: string | null; source: string | null };
  counts: {
    residents: number; households: number; officials: number; users: number; activeUsers: number; citizenAccounts: number;
    mailRequests30d: number; requests30d: number; transactions30d: number;
  };
  lastLogin: string | null;
  modules: ModuleRow[];
  invoices: InvoiceRow[];
};

export type ModuleRow = { id: number; moduleCode: string; planCode: string | null; status: string; startDate: string; expiryDate: string; expired: boolean };
export type InvoiceRow = {
  id: string; invoiceNumber: string; productType: string; planCode: string; amount: number; status: string;
  createdAt: string; paidAt: string | null; expiresAt: string | null;
};

const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const nf = new Intl.NumberFormat("id-ID");

export const fmtDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : "-");
export const fmtDateTime = (iso: string | null | undefined) => (iso ? dateTimeFmt.format(new Date(iso)) : "-");
export const fmtNum = (n: number) => nf.format(n);
export const fmtRupiah = (n: number) => `Rp${nf.format(Math.round(n))}`;

export const PHASE_LABEL: Record<Phase, string> = {
  trial: "Uji coba",
  grace: "Tenggang (baca saja)",
  active: "Berlangganan aktif",
  inactive: "Tidak aktif",
};

export const STATUS_LABEL: Record<string, string> = {
  active: "Aktif", trial: "Uji coba", grace: "Tenggang", inactive: "Tidak aktif", cancelled: "Dibatalkan",
};

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  paid: "Lunas", pending: "Menunggu", expired: "Kedaluwarsa", failed: "Gagal", cancelled: "Dibatalkan",
};

export const PRODUCT_LABEL: Record<string, string> = {
  desa_package: "Paket desa", absensi: "Kapasitas absensi", absensi_gps_addon: "Add-on GPS absensi", arsip: "Arsip digital",
  website: "Website", website_custom: "Website kustom", ai_credits: "Kredit AI", module_addon: "Add-on modul",
};

export const ROLE_LABEL: Record<string, string> = {
  admin: "Admin", staff: "Staf", village_head: "Kepala desa", secretary: "Sekretaris",
};

/** Respons galat server -> Error berpesan Indonesia. */
export async function readError(res: Response, fallback: string): Promise<Error> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return new Error(data?.error || fallback);
}
