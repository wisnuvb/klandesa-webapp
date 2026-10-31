/** Ringkasan perubahan untuk AuditLog. Nilai kolom sensitif tidak disimpan, hanya penanda bahwa kolom itu berubah. */
export type FieldChange = { from: unknown; to: unknown } | { changed: true };

function normalize(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "bigint") return v.toString();
  return JSON.stringify(v ?? null);
}

/**
 * Pola nama kolom yang nilainya tidak boleh masuk log (identitas, kontak, rahasia, uang pribadi, berkas).
 * Selalu berlaku di `diffRecord`/`pickSummary`, di atas `maskedFields` per entitas.
 */
export const SENSITIVE_KEY_PATTERN =
  /nik|(^|[^a-z])kk($|[^a-z])|phone|telp|hp$|whatsapp|email|address|alamat|password|token|secret|apikey|rekening|account|bank|income|gaji|salary|photo|foto|cover|thumb|url$|signature|ttd/i;

export function isSensitiveKey(key: string, extra?: ReadonlySet<string>): boolean {
  return Boolean(extra?.has(key)) || SENSITIVE_KEY_PATTERN.test(key);
}

/** Ringkasan aman untuk aksi buat/hapus: hanya kolom yang disebut eksplisit (label, status, jumlah), tanpa kolom sensitif. */
export function pickSummary(
  record: Record<string, unknown>,
  keys: readonly string[],
  extraMasked?: ReadonlySet<string>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (!(k in record) || isSensitiveKey(k, extraMasked)) continue;
    const v = record[k];
    out[k] = v instanceof Date ? v.toISOString() : typeof v === "bigint" ? v.toString() : v;
  }
  return out;
}

export function diffRecord(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  opts: { maskedFields?: ReadonlySet<string>; ignoreFields?: ReadonlySet<string> } = {},
): Record<string, FieldChange> {
  const out: Record<string, FieldChange> = {};
  for (const key of Object.keys(after)) {
    if (opts.ignoreFields?.has(key)) continue;
    if (!(key in before)) continue;
    if (normalize(before[key]) === normalize(after[key])) continue;
    out[key] = isSensitiveKey(key, opts.maskedFields)
      ? { changed: true }
      : { from: before[key] instanceof Date ? (before[key] as Date).toISOString() : before[key], to: after[key] instanceof Date ? (after[key] as Date).toISOString() : after[key] };
  }
  return out;
}

/** Kolom `Resident` yang nilainya tidak boleh masuk log (identitas, kontak, ekonomi, media). */
export const RESIDENT_AUDIT_MASKED: ReadonlySet<string> = new Set([
  "nik", "kk", "fatherNik", "motherNik", "phone", "email", "address", "income",
  "tempIdNumber", "cover", "coverThumb", "photo", "photoThumb",
]);

export const RESIDENT_AUDIT_IGNORED: ReadonlySet<string> = new Set(["updatedAt", "createdAt"]);
