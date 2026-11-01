import type { PermissionAction } from "./actions";
import type { PermissionResource } from "./resources";

export type ApiPermissionRule = {
  resource: PermissionResource;
  /** Override action; default derived from HTTP method. */
  action?: PermissionAction;
};

type RouteRule = {
  prefix: string;
  resource: PermissionResource;
  /** Path suffix → action override */
  suffixActions?: Record<string, PermissionAction>;
};

/**
 * Rute dengan id di tengah jalur (mis. /api/x/12/persetujuan) tidak bisa dipetakan lewat awalan, jadi dicocokkan dengan pola.
 * Dipakai bila aksi yang berlaku bukan turunan metode HTTP: persetujuan = "approve" (Kepala Desa tidak punya "create"),
 * atau rute yang memeriksa izin per aksi di dalam rute (gerbang kasar = "read"). Dicek lebih dulu daripada awalan.
 */
const PATTERN_RULES: { pattern: RegExp; resource: PermissionResource; action: PermissionAction }[] = [
  { pattern: /^\/api\/perencanaan\/rkpdes\/\d+\/persetujuan$/, resource: "perencanaan", action: "approve" },
  // Aksi musyawarah: update untuk operator, approve untuk membuka kembali berita acara final; keduanya dicek di dalam rute.
  { pattern: /^\/api\/musdes\/\d+\/aksi$/, resource: "perencanaan", action: "read" },
  // BLT Desa: penetapan, penyelesaian, dan pembukaan kembali = approve; cetak SK/tanda terima (memuat NIK) = export.
  { pattern: /^\/api\/blt\/\d+\/status$/, resource: "blt", action: "approve" },
  { pattern: /^\/api\/blt\/\d+\/cetak$/, resource: "blt", action: "export" },
  // Mengganti atau mengakhiri penerima setelah SK = setara menghapus: tidak untuk operator.
  { pattern: /^\/api\/blt\/\d+\/penerima\/\d+\/ganti$/, resource: "blt", action: "delete" },
];

/** Prefix match — urutan dari spesifik ke umum. */
const ROUTE_RULES: RouteRule[] = [
  { prefix: "/api/residents/export", resource: "residents", suffixActions: { "": "export" } },
  { prefix: "/api/residents/bulk", resource: "residents", suffixActions: { "": "create" } },
  { prefix: "/api/residents/photo-upload", resource: "residents", suffixActions: { "": "update" } },
  { prefix: "/api/residents", resource: "residents" },
  { prefix: "/api/kk", resource: "residents" },
  { prefix: "/api/kependudukan/mutasi/keputusan", resource: "residents", suffixActions: { "": "approve" } },
  { prefix: "/api/kependudukan", resource: "residents" },
  { prefix: "/api/officials", resource: "officials" },
  { prefix: "/api/positions", resource: "officials" },
  { prefix: "/api/village-potentials", resource: "potentials" },
  { prefix: "/api/finance/sdg-spending", resource: "finance" },
  { prefix: "/api/finance/village-budgets", resource: "anggaran" },
  { prefix: "/api/finance", resource: "finance" },
  { prefix: "/api/iuran", resource: "rtrw" },
  { prefix: "/api/mail-requests/export", resource: "mail", suffixActions: { "": "export" } },
  { prefix: "/api/mail-requests", resource: "mail" },
  { prefix: "/api/mail-templates", resource: "mail" },
  { prefix: "/api/mail-services", resource: "mail" },
  { prefix: "/api/letters", resource: "mail" },
  { prefix: "/api/layanan-surat", resource: "mail" },
  { prefix: "/api/kiosk/settings", resource: "mail" },
  { prefix: "/api/kiosk/devices", resource: "mail" },
  // Daftar warga memuat NIK: wajib izin ekspor data warga, bukan sekadar membaca statistik.
  { prefix: "/api/statistics/residents-by-category/export", resource: "residents", suffixActions: { "": "export" } },
  { prefix: "/api/statistics", resource: "statistics" },
  { prefix: "/api/dashboard/stats", resource: "statistics" },
  { prefix: "/api/dashboard/idm", resource: "statistics" },
  { prefix: "/api/activities/recent", resource: "statistics" },
  { prefix: "/api/announcements", resource: "announcements" },
  { prefix: "/api/forum-threads", resource: "forum" },
  { prefix: "/api/citizen-reports", resource: "citizen_reports" },
  { prefix: "/api/social-benefits", resource: "social_benefits" },
  { prefix: "/api/attendance", resource: "attendance" },
  { prefix: "/api/digital-archives", resource: "archive" },
  { prefix: "/api/ukm-products", resource: "ukm" },
  { prefix: "/api/website", resource: "website" },
  { prefix: "/api/village/profile", resource: "settings" },
  { prefix: "/api/billing", resource: "billing" },
  { prefix: "/api/pkk/export", resource: "pkk", suffixActions: { "": "export" } },
  { prefix: "/api/pkk", resource: "pkk" },
  { prefix: "/api/sdgs", resource: "sdgs" },
  { prefix: "/api/rpjmdes", resource: "rpjmdes" },
  { prefix: "/api/pertanian", resource: "pertanian" },
  { prefix: "/api/rtrw", resource: "rtrw" },
  { prefix: "/api/developer", resource: "integrations" },
  { prefix: "/api/custom-data", resource: "custom_data" },
  { prefix: "/api/laporan-desa/penyerahan", resource: "apbdes", suffixActions: { "": "approve" } },
  { prefix: "/api/laporan-desa", resource: "apbdes" },
  { prefix: "/api/apbdes/laporan", resource: "apbdes", suffixActions: { "": "export" } },
  { prefix: "/api/apbdes/bulan/persetujuan", resource: "apbdes", suffixActions: { "": "approve" } },
  { prefix: "/api/apbdes/dpa/persetujuan", resource: "apbdes", suffixActions: { "": "approve" } },
  { prefix: "/api/apbdes/spp/persetujuan", resource: "apbdes", suffixActions: { "": "approve" } },
  { prefix: "/api/apbdes", resource: "apbdes" },
  { prefix: "/api/dana-desa/pengecualian", resource: "apbdes", suffixActions: { "": "approve" } },
  { prefix: "/api/dana-desa", resource: "apbdes" },
  { prefix: "/api/pktd", resource: "apbdes" },
  { prefix: "/api/kdmp", resource: "apbdes" },
  { prefix: "/api/aset-desa/buku", resource: "aset_desa", suffixActions: { "": "export" } },
  { prefix: "/api/aset-desa", resource: "aset_desa" },
  { prefix: "/api/tata-kelola/produk-hukum", resource: "produk_hukum" },
  { prefix: "/api/tata-kelola/surat", resource: "register_surat" },
  { prefix: "/api/tata-kelola/lembaga", resource: "lembaga_desa" },
  { prefix: "/api/dtsen", resource: "dtsen_usulan" },
  { prefix: "/api/musdes", resource: "perencanaan" },
  { prefix: "/api/blt", resource: "blt" },
  { prefix: "/api/perencanaan", resource: "perencanaan" },
  { prefix: "/api/polls", resource: "polls" },
  { prefix: "/api/integrations/export", resource: "integrations", suffixActions: { "": "export" } },
  { prefix: "/api/integrations", resource: "integrations" },
  { prefix: "/api/gis", resource: "gis" },
  { prefix: "/api/lingkungan", resource: "lingkungan" },
  // Bertanya ke Laras (POST) dan menghapus percakapan sendiri (DELETE) tidak mengubah data desa: cukup izin baca.
  // Data yang dibaca Laras dicek lagi per tool terhadap izin baca pengguna (lib/ai/laras-tools.ts).
  { prefix: "/api/ai/village-assistant", resource: "ai_assistant", suffixActions: { "": "read" } },
  { prefix: "/api/ai/threads", resource: "ai_assistant", suffixActions: { "": "read" } },
  // Konfirmasi usulan Laras: izin sesungguhnya (mis. mail:update) dicek di dalam handler per jenis aksi.
  { prefix: "/api/ai/actions", resource: "ai_assistant", suffixActions: { "": "read" } },
  // Menandai notifikasi dibaca hanya mengubah status baca milik sendiri, bukan data desa: cukup izin baca.
  { prefix: "/api/notifications/read", resource: "statistics", suffixActions: { "": "read" } },
  { prefix: "/api/notifications", resource: "statistics" },
  { prefix: "/api/ai/credit", resource: "settings" },
];

/** Path API yang hanya auth desa, tanpa cek permission matrix. */
const RBAC_EXCLUDED_PREFIXES = [
  "/api/admin",
  "/api/partner",
  "/api/regional",
  "/api/coop",
  "/api/bumdes",
  "/api/auth",
  "/api/mobile",
  "/api/kiosk/requests",
  "/api/kiosk/services",
  "/api/public",
  "/api/pangan",
  "/api/beasiswa",
  "/api/contacts",
  "/api/referrals",
  "/api/partner-applications",
  "/api/billing/linkqu/callback",
  "/api/attendance/scan",
  "/api/test-session",
];

export function httpMethodToAction(method: string): PermissionAction {
  switch (method.toUpperCase()) {
    case "GET":
    case "HEAD":
      return "read";
    case "POST":
      return "create";
    case "PUT":
    case "PATCH":
      return "update";
    case "DELETE":
      return "delete";
    default:
      return "read";
  }
}

export function resolveApiPermission(
  pathname: string,
  method: string,
): { resource: PermissionResource; action: PermissionAction } | null {
  for (const excluded of RBAC_EXCLUDED_PREFIXES) {
    if (pathname.startsWith(excluded)) return null;
  }

  for (const rule of PATTERN_RULES) {
    if (rule.pattern.test(pathname)) return { resource: rule.resource, action: rule.action };
  }

  for (const rule of ROUTE_RULES) {
    if (!pathname.startsWith(rule.prefix)) continue;

    const suffix = pathname.slice(rule.prefix.length);
    const suffixAction = rule.suffixActions?.[suffix] ?? rule.suffixActions?.[""];
    const action = suffixAction ?? httpMethodToAction(method);

    return { resource: rule.resource, action };
  }

  return null;
}
