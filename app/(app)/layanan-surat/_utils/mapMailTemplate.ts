import type { TemplateBody } from "../types";

/**
 * Satu bentuk mapping GET /api/mail-templates & respons duplicate/create.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapApiMailTemplateToBody(t: any): TemplateBody {
  const ts = t.templateStructure || {};
  const isGlobal = Boolean(t.isGlobal);
  const villageId = t.villageId ?? t.village_id;
  const isCatalog = isGlobal && (villageId == null || villageId === undefined);

  return {
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    content_template: t.contentTemplate,
    variables: ts.variables || [],
    header: ts.header || ts.shared_header,
    footer: ts.footer || ts.shared_footer,
    shared_header: ts.shared_header,
    shared_footer: ts.shared_footer,
    blocks: ts.blocks || [],
    pages: ts.pages || [],
    is_multi_page: ts.is_multi_page || false,
    letterNumber: ts.letterNumber,
    show_header: ts.show_header,
    show_footer: ts.show_footer,
    show_header_default: ts.show_header_default,
    show_footer_default: ts.show_footer_default,
    variable_groups: ts.variable_groups,
    is_active: t.isActive,
    created_at: t.createdAt,
    usage_count: t.usageCount,
    is_catalog: isCatalog,
    catalog_key: t.catalogKey ?? null,
    inherits_catalog_key: t.inheritsCatalogKey ?? null,
  };
}
