/**
 * Pemakaian dana SPP oleh modul pembayaran (BLT Desa, PKTD, KDMP): pembayaran yang dicatat modul dengan `sppId` adalah realisasi
 * (pertanggungjawaban) atas SPP itu. Berkas terpisah agar dapat dipakai spp.ts dan funding.ts tanpa impor melingkar.
 */
import type { Prisma } from "@prisma/client";

type Db = Prisma.TransactionClient;

/** Jumlah (sen) yang sudah dibayarkan modul untuk tiap SPP. */
export async function moduleSpentBySpp(db: Db, requestIds: number[]): Promise<Map<number, bigint>> {
  const out = new Map<number, bigint>();
  if (!requestIds.length) return out;
  const where = { sppId: { in: requestIds } };
  const [blt, pktd, kdmp] = await Promise.all([
    db.bltPayment.groupBy({ by: ["sppId"], where, _sum: { amountCents: true } }),
    db.pktdWorkDay.groupBy({ by: ["sppId"], where, _sum: { wageCents: true } }),
    db.kdmpInstallment.groupBy({ by: ["sppId"], where, _sum: { amountCents: true } }),
  ]);
  const add = (id: number | null, v: bigint | null) => {
    if (id !== null) out.set(id, (out.get(id) ?? 0n) + (v ?? 0n));
  };
  for (const g of blt) add(g.sppId, g._sum.amountCents);
  for (const g of pktd) add(g.sppId, g._sum.wageCents);
  for (const g of kdmp) add(g.sppId, g._sum.amountCents);
  return out;
}

/**
 * Mengunci baris modul pemilik suatu SPP bersumber modul (BLT: program, PKTD: kegiatan, KDMP: pengaturan tahun). Alur yang mengubah
 * kapasitas dana SPP di luar pencatatan pembayaran (pengembalian panjar) memakainya sebagai pernyataan PERTAMA dalam transaksi, sebelum
 * kunci tahun APB Desa, dengan urutan yang sama dengan pengajuan SPP dari modul (modul lalu tahun).
 */
export async function lockModuleRow(tx: Db, villageId: number, kind: string, sourceId: number): Promise<void> {
  if (kind === "BLT") await tx.$queryRaw`SELECT id FROM blt_programs WHERE id = ${sourceId} AND villageId = ${villageId} FOR UPDATE`;
  else if (kind === "PKTD") await tx.$queryRaw`SELECT id FROM pktd_activities WHERE id = ${sourceId} AND villageId = ${villageId} FOR UPDATE`;
  else if (kind === "KDMP") await tx.$queryRaw`SELECT id FROM dd_year_settings WHERE villageId = ${villageId} AND year = ${sourceId} FOR UPDATE`;
}
