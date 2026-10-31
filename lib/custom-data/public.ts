/** Bentuk data kustom yang boleh keluar lewat API: hanya kolom aktif berkelas NONE. Kolom pribadi/sensitif tidak pernah keluar. */
import type { FieldDef } from "./schema";

export const publicFields = (fields: readonly FieldDef[]): FieldDef[] => fields.filter((f) => !f.isArchived && f.piiClass === "NONE");

export function publicFieldView(f: FieldDef) {
  return {
    key: f.key,
    label: f.label,
    type: f.type,
    required: f.required,
    options: f.type === "select" && Array.isArray(f.options) ? (f.options as string[]) : null,
  };
}

export function publicRecordData(data: unknown, fields: readonly FieldDef[]): Record<string, unknown> {
  const src = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  for (const f of publicFields(fields)) if (Object.prototype.hasOwnProperty.call(src, f.key)) out[f.key] = src[f.key];
  return out;
}
