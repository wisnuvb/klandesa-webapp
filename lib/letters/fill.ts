/**
 * Isi placeholder `{kunci}`, `{kunci|format}` dan `{{kunci}}` dalam satu kali lintasan.
 * Satu pass (O(panjang teks)), dan nilai yang disisipkan tidak pernah diproses ulang —
 * jadi isian warga yang berisi `{NAMA}` tidak bisa memicu penggantian bertingkat.
 */
import { applyFormat, FORMAT_IDS, type FormatId } from "./format";

const PLACEHOLDER = /\{\{\s*([A-Za-z0-9_.]+)\s*(?:\|\s*([a-z_]+)\s*)?\}\}|\{([A-Za-z0-9_.]+)(?:\|([a-z_]+))?\}/g;
const FORMATS = new Set<string>(FORMAT_IDS);

export type FillOptions = {
  /** `keep` (bawaan): placeholder tak dikenal dibiarkan apa adanya; `empty`: dihapus. */
  onMissing?: "keep" | "empty";
};

export function fillPlaceholders(
  text: string,
  values: Readonly<Record<string, string>>,
  options: FillOptions = {},
): string {
  if (!text) return "";
  return text.replace(PLACEHOLDER, (whole, k1?: string, f1?: string, k2?: string, f2?: string) => {
    const key = k1 ?? k2 ?? "";
    const fmt = f1 ?? f2;
    if (!Object.prototype.hasOwnProperty.call(values, key)) {
      return options.onMissing === "empty" ? "" : whole;
    }
    const raw = values[key] ?? "";
    return fmt && FORMATS.has(fmt) ? applyFormat(raw, fmt as FormatId) : raw;
  });
}
