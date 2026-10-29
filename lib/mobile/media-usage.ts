import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { getSpacesClient } from "@/lib/spaces";
import { mobileMediaPrefix, reserveCeiling } from "./media-quota";

/** Pengaman: 50 halaman x 1000 objek. Lebih dari itu pasti sudah melewati kuota. */
const MAX_LIST_PAGES = 50;

/** Jumlah byte sebenarnya di bucket untuk satu desa. Mahal (satu permintaan per 1.000 objek): hanya untuk mengisi awal dan rekonsiliasi. */
export async function countMobileMediaBytesInBucket(villageCode: string, bucket: string): Promise<number> {
  const client = getSpacesClient();
  let total = 0;
  let token: string | undefined;
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const out = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: mobileMediaPrefix(villageCode), ContinuationToken: token }),
    );
    for (const obj of out.Contents ?? []) total += obj.Size ?? 0;
    if (!out.IsTruncated || !out.NextContinuationToken) break;
    token = out.NextContinuationToken;
  }
  return total;
}

/** Coba tambahkan `bytes` ke penghitung hanya bila hasilnya tidak melewati batas. Satu pernyataan SQL, aman antar-instans. */
async function tryReserve(villageId: number, bytes: number, limit: number): Promise<boolean> {
  const ceiling = reserveCeiling(bytes, limit);
  if (ceiling < 0) return false;
  const res = await prisma.villageMediaUsage.updateMany({
    where: { villageId, mobileBytes: { lte: BigInt(ceiling) } },
    data: { mobileBytes: { increment: BigInt(bytes) } },
  });
  return res.count === 1;
}

/**
 * Pesan ruang untuk satu unggahan. Pemakaian dibaca dari tabel (tanpa menyentuh bucket); bucket hanya dihitung sekali per
 * desa, saat baris belum ada, untuk mengisi foto yang sudah terlanjur tersimpan. Mengembalikan false bila kuota penuh.
 * Pemanggil harus melepas pesanan (releaseMobileMedia) bila unggahan akhirnya batal sebelum URL diberikan.
 */
export async function reserveMobileMedia(
  village: { id: number; code: string },
  bucket: string,
  bytes: number,
  limit: number,
): Promise<boolean> {
  if (await tryReserve(village.id, bytes, limit)) return true;

  const row = await prisma.villageMediaUsage.findUnique({ where: { villageId: village.id }, select: { villageId: true } });
  if (row) return false; // baris ada, jadi memang penuh

  const seeded = await countMobileMediaBytesInBucket(village.code, bucket);
  // skipDuplicates: bila dua permintaan mengisi bersamaan, yang kedua tidak menimpa penghitung yang sudah bertambah.
  await prisma.villageMediaUsage.createMany({ data: [{ villageId: village.id, mobileBytes: BigInt(seeded) }], skipDuplicates: true });
  return tryReserve(village.id, bytes, limit);
}

/** Kurangi penghitung (foto dihapus atau unggahan batal). Tidak pernah menghasilkan nilai negatif. */
export async function releaseMobileMedia(villageId: number, bytes: number): Promise<void> {
  if (!(bytes > 0)) return;
  const n = BigInt(Math.floor(bytes));
  const dec = await prisma.villageMediaUsage.updateMany({
    where: { villageId, mobileBytes: { gte: n } },
    data: { mobileBytes: { decrement: n } },
  });
  if (dec.count === 0) {
    await prisma.villageMediaUsage.updateMany({ where: { villageId, mobileBytes: { lt: n } }, data: { mobileBytes: 0n } });
  }
}

/** Samakan penghitung dengan isi bucket (untuk skrip rekonsiliasi). Mengembalikan nilai sebelum dan sesudah. */
export async function reconcileMobileMedia(
  village: { id: number; code: string },
  bucket: string,
): Promise<{ before: number | null; after: number }> {
  const actual = await countMobileMediaBytesInBucket(village.code, bucket);
  const prev = await prisma.villageMediaUsage.findUnique({ where: { villageId: village.id }, select: { mobileBytes: true } });
  await prisma.villageMediaUsage.upsert({
    where: { villageId: village.id },
    create: { villageId: village.id, mobileBytes: BigInt(actual) },
    update: { mobileBytes: BigInt(actual) },
  });
  return { before: prev ? Number(prev.mobileBytes) : null, after: actual };
}
