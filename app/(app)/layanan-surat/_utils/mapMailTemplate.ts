import type { TemplateBody } from "../types";

/** Baris `/api/mail-templates` berformat dokumen v2? Daftar ringan membawa `schemaVersion`; baris penuh membawa dokumennya. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isV2Row(t: any): boolean {
  return t?.schemaVersion === 2 || t?.templateStructure?.schemaVersion === 2;
}

/** Satu bentuk mapping GET /api/mail-templates untuk daftar "Atur Jenis Surat". */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapApiMailTemplateToBody(t: any): TemplateBody {
  const villageId = t.villageId ?? t.village_id;
  return {
    id: t.id,
    name: t.name,
    description: t.description ?? "",
    category: t.category,
    is_active: t.isActive,
    created_at: t.createdAt,
    usage_count: t.usageCount,
    is_catalog: Boolean(t.isGlobal) && villageId == null,
    catalog_key: t.catalogKey ?? null,
    inherits_catalog_key: t.inheritsCatalogKey ?? null,
  };
}
