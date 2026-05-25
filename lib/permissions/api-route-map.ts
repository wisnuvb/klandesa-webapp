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

/** Prefix match — urutan dari spesifik ke umum. */
const ROUTE_RULES: RouteRule[] = [
  { prefix: "/api/residents/export", resource: "residents", suffixActions: { "": "export" } },
  { prefix: "/api/residents/bulk", resource: "residents", suffixActions: { "": "create" } },
  { prefix: "/api/residents", resource: "residents" },
  { prefix: "/api/kk", resource: "residents" },
  { prefix: "/api/officials", resource: "officials" },
  { prefix: "/api/positions", resource: "officials" },
  { prefix: "/api/village-potentials", resource: "potentials" },
  { prefix: "/api/finance/sdg-spending", resource: "finance" },
  { prefix: "/api/finance/village-budgets", resource: "anggaran" },
  { prefix: "/api/finance", resource: "finance" },
  { prefix: "/api/mail-requests/export", resource: "mail", suffixActions: { "": "export" } },
  { prefix: "/api/mail-requests", resource: "mail" },
  { prefix: "/api/mail-templates", resource: "mail" },
  { prefix: "/api/mail-services", resource: "mail" },
  { prefix: "/api/layanan-surat", resource: "mail" },
  { prefix: "/api/kiosk/settings", resource: "mail" },
  { prefix: "/api/kiosk/devices", resource: "mail" },
  { prefix: "/api/statistics", resource: "statistics" },
  { prefix: "/api/dashboard/stats", resource: "statistics" },
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
  { prefix: "/api/integrations/export", resource: "integrations", suffixActions: { "": "export" } },
  { prefix: "/api/integrations", resource: "integrations" },
  { prefix: "/api/gis", resource: "gis" },
  { prefix: "/api/lingkungan", resource: "lingkungan" },
  { prefix: "/api/ai/village-assistant", resource: "ai_assistant" },
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

  for (const rule of ROUTE_RULES) {
    if (!pathname.startsWith(rule.prefix)) continue;

    const suffix = pathname.slice(rule.prefix.length);
    const suffixAction = rule.suffixActions?.[suffix] ?? rule.suffixActions?.[""];
    const action = suffixAction ?? httpMethodToAction(method);

    return { resource: rule.resource, action };
  }

  return null;
}
