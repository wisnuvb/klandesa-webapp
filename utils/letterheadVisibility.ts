/**
 * Menentukan apakah kop surat (letterhead) / footer tampil, konsisten antara
 * builder preview, preview surat, PDF, dan cetak.
 */

type TemplateFlags = {
  show_header?: boolean;
  show_footer?: boolean;
  show_header_default?: boolean;
  show_footer_default?: boolean;
  is_multi_page?: boolean;
};

type PageFlags = {
  show_header?: boolean;
  show_footer?: boolean;
};

export function isLetterheadVisible(
  template: TemplateFlags,
  page?: PageFlags,
): boolean {
  if (template.show_header === false) return false;
  if (template.is_multi_page && page) {
    return (
      (page.show_header ?? template.show_header_default ?? true) !== false
    );
  }
  return true;
}

export function isFooterBlockVisible(
  template: TemplateFlags,
  page?: PageFlags,
): boolean {
  if (template.show_footer === false) return false;
  if (template.is_multi_page && page) {
    return (
      (page.show_footer ?? template.show_footer_default ?? true) !== false
    );
  }
  return true;
}
