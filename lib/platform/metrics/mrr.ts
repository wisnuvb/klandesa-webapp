/**
 * Estimasi MRR/ARR (PERKIRAAN, bukan pembukuan). MURNI: menerima hitungan hasil agregat SQL, memakai harga dari katalog di kode
 * (lib/billing/catalog.ts, lengkap.ts, attendance/addons.ts) sehingga mengikuti perubahan harga otomatis.
 *
 * Rumus (setiap desa BERLANGGANAN AKTIF NYATA = status "active", belum lewat masa berlaku, desa aktif, DAN pernah punya tagihan paket lunas;
 * desa aktif tanpa tagihan lunas = diaktifkan manual/bawaan skema/migrasi, TIDAK dihitung, hanya dilaporkan jumlahnya):
 *  - Paket Lengkap tahun pertama (ada tagihan lunas biaya awal >= Rp3,5 jt dalam 12 bulan terakhir): biaya awal / 12
 *    (biaya awal sudah termasuk 12 bulan, jadi dinormalkan per bulan). Selain itu (perpanjangan): Rp100.000 per bulan.
 *  - Paket lama (starter/profesional/enterprise): biaya tahunan / 12.
 *  - Add-on aktif (VillageModuleSubscription): kapasitas absensi = selisih harga dari tier yang sudah termasuk paket; arsip = harga katalog tier;
 *    Website Desa Kustom = biaya awal / 12 (tahun pertama) atau Rp78.000 (perpanjangan); add-on modul = harga katalog,
 *    kecuali desa Paket Lengkap (modul itu sudah termasuk, tidak ditagih).
 *  - Add-on GPS aktif dengan tanggal berakhir (yang tanpa tanggal berakhir = diaktifkan admin, tidak dihitung).
 *  - Kredit AI (dibeli sekali pakai, bukan langganan): dihitung sebagai run-rate = total tagihan `ai_credits` lunas 90 hari terakhir ÷ 3,
 *    hanya dari desa berlangganan aktif nyata. Bersifat variabel (bergantung pemakaian), jadi tampil sebagai baris tersendiri.
 * Tidak dihitung: trial, masa tenggang, desa aktif tanpa tagihan paket lunas, diskon manual.
 */
import { BILLING_CATALOG } from "@/lib/billing/catalog";
import { isLengkapPlan, LENGKAP_MONTHLY_FEE, LENGKAP_SETUP_FEE } from "@/lib/billing/lengkap";
import { capacityAddonPrice, isCapacityAddonCode, ATTENDANCE_CAPACITY_MODULE_CODE } from "@/lib/attendance/addons";
import { ARSIP_ADDON_MODULE_CODE } from "@/lib/digitalArchive/storage-limit";
import { WEBSITE_CUSTOM_MODULE_CODE } from "@/lib/website-service/subscription";
import { formatRupiah } from "./format";

export type MrrPackageRow = { plan: string; firstYear: boolean; everPaid: boolean; count: number };
export type MrrModuleRow = { moduleCode: string; planCode: string | null; villagePlan: string | null; firstYear: boolean; count: number };
/** Pembelian kredit AI lunas dalam 90 hari terakhir oleh desa berlangganan aktif nyata. */
export type MrrAiCreditInput = { villages: number; total90d: number };
export type MrrInput = { packages: MrrPackageRow[]; modules: MrrModuleRow[]; gpsAddonVillages: number; aiCredit?: MrrAiCreditInput };

export type MrrLine = { key: string; label: string; count: number; unit: number; subtotal: number };
export type MrrEstimate = {
  mrr: number;
  arr: number;
  lines: MrrLine[];
  /** Desa berlangganan aktif nyata (punya tagihan paket lunas) yang dihitung. */
  activeVillages: number;
  /** Desa berstatus aktif tetapi belum pernah punya tagihan paket lunas (diaktifkan manual/bawaan/migrasi): TIDAK dihitung dalam MRR. */
  activeWithoutPaidInvoice: number;
  assumptions: string[];
};

export const MRR_ASSUMPTIONS: string[] = [
  "Ini PERKIRAAN run-rate bulanan, bukan pembukuan: pendapatan sebenarnya ada di grafik pendapatan (tagihan lunas).",
  `Paket Lengkap tahun pertama = biaya awal ${formatRupiah(LENGKAP_SETUP_FEE)} dibagi 12 bulan; perpanjangan = ${formatRupiah(LENGKAP_MONTHLY_FEE)} per bulan.`,
  "Paket lama = biaya tahunan dibagi 12. Add-on (arsip/storage, kapasitas absensi, GPS, modul, website) dihitung dari langganan add-on yang masih berlaku dengan harga katalog.",
  "Kredit AI dibeli sekali pakai, jadi dihitung sebagai rata-rata bulanan pembelian lunas 90 hari terakhir (total ÷ 3); angkanya naik-turun mengikuti pemakaian.",
  "Hanya desa berlangganan aktif NYATA yang dihitung: status aktif, belum kedaluwarsa, dan pernah punya tagihan paket lunas. Trial, masa tenggang, dan desa yang diaktifkan manual tanpa tagihan tidak dihitung.",
  "Diskon/harga khusus tidak terbaca (dipakai harga katalog).",
  "ARR = MRR × 12.",
];

const catalogDesa = BILLING_CATALOG.desa_package.tiers;
const LENGKAP_FIRST_YEAR_MONTHLY = catalogDesa.lengkap.setupFee / 12;
const WEBSITE_FIRST_YEAR_MONTHLY = BILLING_CATALOG.website_custom.setupFee / 12;

type Acc = Map<string, MrrLine>;
function add(acc: Acc, key: string, label: string, count: number, unit: number) {
  if (count <= 0) return;
  const cur = acc.get(key);
  if (cur) {
    cur.count += count;
    cur.subtotal += count * unit;
    cur.unit = cur.subtotal / cur.count;
  } else acc.set(key, { key, label, count, unit, subtotal: count * unit });
}

export function computeMrr(input: MrrInput): MrrEstimate {
  const acc: Acc = new Map();
  let activeVillages = 0;
  let activeWithoutPaidInvoice = 0;

  for (const p of input.packages) {
    if (!p.everPaid) {
      // Aktif tanpa tagihan paket lunas: bukan pelanggan nyata, tidak masuk MRR (hanya dilaporkan).
      activeWithoutPaidInvoice += p.count;
      continue;
    }
    activeVillages += p.count;
    const plan = p.plan.toLowerCase();
    if (isLengkapPlan(plan)) {
      if (p.firstYear) add(acc, "lengkap_y1", "Paket Lengkap — tahun pertama (biaya awal ÷ 12)", p.count, LENGKAP_FIRST_YEAR_MONTHLY);
      else add(acc, "lengkap_renewal", "Paket Lengkap — perpanjangan bulanan", p.count, LENGKAP_MONTHLY_FEE);
    } else if (Object.hasOwn(catalogDesa, plan)) {
      const t = catalogDesa[plan as keyof typeof catalogDesa];
      add(acc, `paket_${plan}`, `Paket ${t.name} (biaya tahunan ÷ 12)`, p.count, t.annualFee / 12);
    } else {
      // Paket tak dikenal: tidak ada harga di katalog -> tidak dihitung (jangan mengarang angka).
      add(acc, "paket_tak_dikenal", "Paket tak dikenal (Rp 0, tidak dihitung)", p.count, 0);
    }
  }

  for (const m of input.modules) {
    if (m.count <= 0) continue;
    const lengkap = isLengkapPlan(m.villagePlan);
    if (m.moduleCode === ATTENDANCE_CAPACITY_MODULE_CODE) {
      if (m.planCode && isCapacityAddonCode(m.planCode)) {
        add(acc, "absensi_kapasitas", "Add-on kapasitas absensi (selisih dari tier paket)", m.count, capacityAddonPrice(m.villagePlan, m.planCode));
      }
    } else if (m.moduleCode === ARSIP_ADDON_MODULE_CODE) {
      const tier = (BILLING_CATALOG.arsip.tiers as Record<string, { monthlyFee: number }>)[m.planCode ?? ""];
      if (tier) add(acc, "arsip", "Add-on Arsip Digital", m.count, tier.monthlyFee);
    } else if (m.moduleCode === WEBSITE_CUSTOM_MODULE_CODE) {
      if (m.firstYear) add(acc, "website_y1", "Website Desa Kustom — tahun pertama (biaya awal ÷ 12)", m.count, WEBSITE_FIRST_YEAR_MONTHLY);
      else add(acc, "website_renewal", "Website Desa Kustom — perpanjangan bulanan", m.count, BILLING_CATALOG.website_custom.monthlyFee);
    } else if (Object.hasOwn(BILLING_CATALOG.module_addon, m.moduleCode)) {
      if (!lengkap) {
        const mod = BILLING_CATALOG.module_addon[m.moduleCode as keyof typeof BILLING_CATALOG.module_addon];
        add(acc, "modul_addon", "Add-on modul (desa paket lama)", m.count, mod.monthlyFee);
      }
    }
  }

  add(acc, "gps", "Add-on GPS absensi", input.gpsAddonVillages, BILLING_CATALOG.absensi_gps_addon.monthlyFee);

  const ai = input.aiCredit;
  if (ai && ai.villages > 0 && ai.total90d > 0) {
    add(acc, "ai_credit", "Kredit AI (rata-rata bulanan dari pembelian 90 hari terakhir)", ai.villages, ai.total90d / 3 / ai.villages);
  }

  const lines = [...acc.values()].map((l) => ({ ...l, unit: Math.round(l.unit), subtotal: Math.round(l.subtotal) }));
  const mrr = lines.reduce((t, l) => t + l.subtotal, 0);
  return { mrr, arr: mrr * 12, lines, activeVillages, activeWithoutPaidInvoice, assumptions: MRR_ASSUMPTIONS };
}
