/**
 * Alokasi nomor surat atomik. Dipanggil DI DALAM transaksi pembuatan surat: baris penghitung
 * dikunci (`FOR UPDATE`) sampai transaksi selesai, sehingga dua operator yang menerbitkan surat
 * bersamaan tidak pernah mendapat nomor sama, dan bila pembuatan surat gagal (rollback) nomornya
 * tidak terpakai — urutan resmi tidak bolong.
 */
import type { Prisma } from "@prisma/client";
import { counterScopeKey, formatLetterNumber, type NumberingConfig } from "../numbering";

export type AllocateArgs = {
  villageId: number;
  numbering: Pick<NumberingConfig, "pattern" | "reset" | "padding" | "counterKey"> & { klasifikasi?: string };
  date: Date;
  kodeDesa?: string;
};

export async function allocateLetterNumber(
  tx: Prisma.TransactionClient,
  args: AllocateArgs,
): Promise<{ urut: number; nomor: string }> {
  const scope = counterScopeKey(args.numbering, args.date);

  // Satu pernyataan upsert langsung mengambil kunci exclusive pada baris penghitung. Pola
  // "INSERT IGNORE lalu SELECT ... FOR UPDATE" memicu deadlock saat banyak operator serentak
  // (kunci shared dieskalasi ke exclusive oleh beberapa transaksi sekaligus).
  await tx.$executeRaw`INSERT INTO mail_number_counters (villageId, scopeKey, lastValue, updatedAt)
    VALUES (${args.villageId}, ${scope}, 1, NOW(3))
    ON DUPLICATE KEY UPDATE lastValue = lastValue + 1, updatedAt = NOW(3)`;

  // Kunci sudah kita pegang sampai transaksi selesai, jadi nilai ini tidak bisa diubah pihak lain.
  const rows = await tx.$queryRaw<Array<{ lastValue: number }>>`SELECT lastValue FROM mail_number_counters
    WHERE villageId = ${args.villageId} AND scopeKey = ${scope} FOR UPDATE`;
  if (rows.length !== 1) throw new Error("Penghitung nomor surat tidak ditemukan");
  const urut = Number(rows[0].lastValue);

  return {
    urut,
    nomor: formatLetterNumber(args.numbering.pattern, {
      urut,
      padding: args.numbering.padding,
      date: args.date,
      klasifikasi: args.numbering.klasifikasi,
      kodeDesa: args.kodeDesa,
    }),
  };
}

/** Deadlock (1213) / lock wait timeout (1205) MySQL: aman diulang karena seluruh transaksi di-rollback. */
export function isRetryableLockError(err: unknown): boolean {
  const e = err as { code?: string; meta?: { code?: string } } | null;
  return (e?.code === "P2010" && (e.meta?.code === "1213" || e.meta?.code === "1205")) || e?.code === "P2034";
}

export async function withLockRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts || !isRetryableLockError(err)) throw err;
      await new Promise((r) => setTimeout(r, 15 * i + Math.random() * 25));
    }
  }
}
