/** Mapping prefix API route → module id untuk entitlement check. */
export const API_ROUTE_MODULE_MAP: Array<{ prefix: string; moduleId: string }> = [
  { prefix: "/api/bumdes", moduleId: "bumdes" },
  { prefix: "/api/pkk", moduleId: "pkk" },
  { prefix: "/api/sdgs", moduleId: "sdgs" },
  { prefix: "/api/rpjmdes", moduleId: "rpjmdes" },
  { prefix: "/api/gis", moduleId: "peta-infrastruktur" },
  { prefix: "/api/integrations", moduleId: "sinkronisasi-data" },
  { prefix: "/api/ai", moduleId: "asisten-ai" },
  { prefix: "/api/finance", moduleId: "keuangan" },
  { prefix: "/api/lingkungan", moduleId: "lingkungan" },
  { prefix: "/api/pertanian", moduleId: "pertanian" },
  { prefix: "/api/rtrw", moduleId: "partisipasi-rtrw" },
];

export function resolveModuleIdFromApiPath(pathname: string): string | null {
  for (const { prefix, moduleId } of API_ROUTE_MODULE_MAP) {
    if (pathname.startsWith(prefix)) return moduleId;
  }
  return null;
}
