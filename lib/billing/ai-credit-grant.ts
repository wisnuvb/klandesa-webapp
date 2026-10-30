type MetaLike = unknown;

const asRecord = (v: MetaLike): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

export type AiCreditGrant = { userId: number; credits: number };

/**
 * Kredit AI yang harus ditambahkan untuk tagihan `ai_credits` yang lunas.
 *
 * Jumlah kredit berasal dari baris item tagihan (`kind: "ai_credits"`, dihitung server dari paket resmi saat
 * checkout), bukan dari metadata tagihan: checkout hanya menyimpan `{ userId }` di tagihan. Pemilik akun dari metadata
 * tagihan (diisi dari sesi), dengan item sebagai cadangan untuk tagihan lama.
 *
 * Mengembalikan galat (bukan diam-diam kosong) bila data tidak lengkap, supaya pembayaran lunas tidak pernah
 * berakhir tanpa kredit tanpa ada yang tahu.
 */
export function resolveAiCreditGrant(invoice: {
  metadata: MetaLike;
  items: { metadata: MetaLike }[];
}): { ok: true; grant: AiCreditGrant } | { ok: false; error: string } {
  const invMeta = asRecord(invoice.metadata);
  const itemMeta = invoice.items.map((i) => asRecord(i.metadata)).find((m) => m?.kind === "ai_credits") ?? null;

  const credits = Number(itemMeta?.credits ?? invMeta?.credits);
  const userId = Number(invMeta?.userId ?? itemMeta?.userId);

  if (!Number.isInteger(credits) || credits <= 0) return { ok: false, error: "jumlah kredit tidak ditemukan pada tagihan" };
  if (!Number.isInteger(userId) || userId <= 0) return { ok: false, error: "pemilik akun (userId) tidak ditemukan pada tagihan" };
  return { ok: true, grant: { userId, credits } };
}

/** Penanda di `invoice.metadata` bahwa kredit sudah ditambahkan (mencegah ganda saat perbaikan data lama). */
export const AI_CREDITS_APPLIED_KEY = "creditsAppliedAt";

export function aiCreditsAlreadyApplied(metadata: MetaLike): boolean {
  return asRecord(metadata)?.[AI_CREDITS_APPLIED_KEY] != null;
}
