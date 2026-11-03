import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { getSpacesClient } from "@/lib/spaces";
import { getArchiveFilesBytes, getEffectiveStorageLimitGb, getVillageStorageLimitBytes } from "@/lib/digitalArchive/quota";
import { MOBILE_MEDIA_QUOTA_BYTES, chargedCeiling, isChargedFolder, mobileFolderOfKey, mobileMediaPrefix, reserveCeiling } from "./media-quota";

/** Pengaman: 50 halaman x 1000 objek. Lebih dari itu pasti sudah melewati kuota. */
const MAX_LIST_PAGES = 50;

/** Jumlah byte sebenarnya di bucket untuk satu desa: seluruh foto seluler, dan bagian yang dihitung ke kuota Arsip Digital. Mahal (satu permintaan per 1.000 objek): hanya untuk mengisi awal dan rekonsiliasi. */
export async function countMobileMediaInBucket(villageCode: string, bucket: string): Promise<{ total: number; charged: number }> {
  const client = getSpacesClient();
  let total = 0;
  let charged = 0;
  let token: string | undefined;
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const out = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: mobileMediaPrefix(villageCode), ContinuationToken: token }),
    );
    for (const obj of out.Contents ?? []) {
      const size = obj.Size ?? 0;
      total += size;
      const folder = obj.Key ? mobileFolderOfKey(obj.Key, villageCode) : null;
      if (folder && isChargedFolder(folder)) charged += size;
    }
    if (!out.IsTruncated || !out.NextContinuationToken) break;
    token = out.NextContinuationToken;
  }
  return { total, charged };
}

export async function countMobileMediaBytesInBucket(villageCode: string, bucket: string): Promise<number> {
  return (await countMobileMediaInBucket(villageCode, bucket)).total;
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

  const seeded = await countMobileMediaInBucket(village.code, bucket);
  // skipDuplicates: bila dua permintaan mengisi bersamaan, yang kedua tidak menimpa penghitung yang sudah bertambah.
  await prisma.villageMediaUsage.createMany({
    data: [{ villageId: village.id, mobileBytes: BigInt(seeded.total), chargedBytes: BigInt(seeded.charged) }],
    skipDuplicates: true,
  });
  return tryReserve(village.id, bytes, limit);
}

/** Kurangi penghitung (foto dihapus atau unggahan batal). `chargedBytes` = bagian yang juga dihitung ke kuota Arsip Digital. Tidak pernah negatif. */
export async function releaseMobileMedia(villageId: number, bytes: number, chargedBytes = 0): Promise<void> {
  await decrementClamped(villageId, "mobileBytes", bytes);
  await decrementClamped(villageId, "chargedBytes", chargedBytes);
}

async function decrementClamped(villageId: number, field: "mobileBytes" | "chargedBytes", bytes: number): Promise<void> {
  if (!(bytes > 0)) return;
  const n = BigInt(Math.floor(bytes));
  const dec = await prisma.villageMediaUsage.updateMany({
    where: { villageId, [field]: { gte: n } },
    data: { [field]: { decrement: n } },
  });
  if (dec.count === 0) {
    await prisma.villageMediaUsage.updateMany({ where: { villageId, [field]: { lt: n } }, data: { [field]: 0n } });
  }
}

export type UploadReservation =
  | { ok: true; release: () => Promise<void> }
  | { ok: false; reason: "MEDIA_QUOTA_FULL" | "ARCHIVE_QUOTA_FULL" };

/**
 * Pesan ruang untuk satu unggahan foto seluler di `folder`. Selalu memeriksa pengaman biaya 5 GB (mobileBytes). Untuk folder
 * berbayar, ruang juga harus muat di kuota Arsip Digital desa (berkas arsip + foto seluler berbayar, satu kuota).
 * Gagal terbuka: bila penghitung tidak bisa dipakai, unggahan tetap jalan (sama dengan perilaku lama).
 */
export async function reserveUpload(
  village: { id: number; code: string },
  bucket: string,
  bytes: number,
  folder: string,
): Promise<UploadReservation> {
  const charged = isChargedFolder(folder);
  let reservedAny = false;
  let reservedCharged = false;
  const release = async () => {
    if (reservedAny) await releaseMobileMedia(village.id, bytes, reservedCharged ? bytes : 0).catch(() => undefined);
  };
  try {
    if (!(await reserveMobileMedia(village, bucket, bytes, MOBILE_MEDIA_QUOTA_BYTES))) {
      return { ok: false, reason: "MEDIA_QUOTA_FULL" };
    }
    reservedAny = true;
    if (charged) {
      const v = await prisma.village.findUnique({ where: { id: village.id }, select: { id: true, subscriptionPlan: true, storageLimit: true } });
      if (v) {
        const limitBytes = getVillageStorageLimitBytes(await getEffectiveStorageLimitGb(v));
        // Baris penghitung pasti ada: reserveMobileMedia baru saja memakainya (atau membuatnya).
        const archiveBytes = await getArchiveFilesBytes(village.id);
        const ceiling = chargedCeiling(bytes, limitBytes, archiveBytes);
        const res =
          ceiling < 0
            ? { count: 0 }
            : await prisma.villageMediaUsage.updateMany({
                where: { villageId: village.id, chargedBytes: { lte: BigInt(ceiling) } },
                data: { chargedBytes: { increment: BigInt(bytes) } },
              });
        if (res.count !== 1) {
          await release();
          return { ok: false, reason: "ARCHIVE_QUOTA_FULL" };
        }
        reservedCharged = true;
      }
    }
  } catch (e) {
    console.error("[mobile media] gagal memeriksa kuota foto", e);
  }
  return { ok: true, release };
}

/** Samakan penghitung dengan isi bucket (untuk skrip rekonsiliasi). Mengembalikan nilai sebelum dan sesudah. */
export async function reconcileMobileMedia(
  village: { id: number; code: string },
  bucket: string,
): Promise<{ before: number | null; after: number; chargedBefore: number | null; chargedAfter: number }> {
  const actual = await countMobileMediaInBucket(village.code, bucket);
  const prev = await prisma.villageMediaUsage.findUnique({ where: { villageId: village.id }, select: { mobileBytes: true, chargedBytes: true } });
  await prisma.villageMediaUsage.upsert({
    where: { villageId: village.id },
    create: { villageId: village.id, mobileBytes: BigInt(actual.total), chargedBytes: BigInt(actual.charged) },
    update: { mobileBytes: BigInt(actual.total), chargedBytes: BigInt(actual.charged) },
  });
  return {
    before: prev ? Number(prev.mobileBytes) : null,
    after: actual.total,
    chargedBefore: prev ? Number(prev.chargedBytes) : null,
    chargedAfter: actual.charged,
  };
}
