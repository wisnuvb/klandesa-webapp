/** Nilai fallback aman untuk input type="color" bila token belum hex. */
export function colorPickerFallbackHex(raw: string): string {
  const t = raw.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t;
  if (/^#[0-9A-Fa-f]{3}$/.test(t)) {
    return `#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}`;
  }
  return "#0f766e";
}
