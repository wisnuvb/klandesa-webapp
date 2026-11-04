import { prisma } from "@/lib/prisma";
import { createTtlCache } from "@/lib/cache/ttl-cache";
import { NOTIFICATION_RETENTION, notificationCutoffs } from "./retention-policy";

const TYPE_MAIL = "mail_request_pending";
const TYPE_FINANCE = "finance_transaction";
const TYPE_RESIDENT = "resident_update";

/** Seberapa sering sinkronisasi boleh berjalan per desa (per proses). Hasilnya idempotent, jadi basi 30 detik aman. */
export const NOTIFICATION_SYNC_TTL_MS = 30_000;
const syncThrottle = createTtlCache<number, void>({ ttlMs: NOTIFICATION_SYNC_TTL_MS, maxEntries: 5000 });

type ExistingRow = { sourceKey: string; title: string; body: string | null; href: string | null };
type Desired = { sourceKey: string; title: string; body: string; href: string; createdAt: Date };

/**
 * Samakan baris notifikasi satu `type` dengan daftar yang diinginkan, dengan jumlah query tetap kecil:
 * 1 baca baris yang ada, lalu tulis HANYA selisihnya (hapus yang usang, buat yang baru, ubah yang berubah).
 * Sebelumnya setiap pemanggilan mengeksekusi deleteMany + satu upsert per baris (puluhan transaksi tulis)
 * meski tidak ada yang berubah. `createdAt` baris yang sudah ada tidak pernah diubah (sama seperti upsert lama).
 */
export async function reconcileNotifications(
  villageId: number,
  type: string,
  desired: Desired[],
  /** Baris yang sudah ada untuk `type` ini bila pemanggil sudah membacanya (hemat satu query per tipe). */
  knownExisting?: ExistingRow[],
): Promise<void> {
  const existing =
    knownExisting ??
    (await prisma.adminNotification.findMany({
      where: { villageId, type },
      select: { sourceKey: true, title: true, body: true, href: true },
    }));
  const wanted = new Map(desired.map((d) => [d.sourceKey, d]));
  const have = new Map(existing.map((e) => [e.sourceKey, e]));

  const stale = existing.filter((e) => !wanted.has(e.sourceKey)).map((e) => e.sourceKey);
  if (stale.length > 0) {
    await prisma.adminNotification.deleteMany({ where: { villageId, type, sourceKey: { in: stale } } });
  }

  const toCreate = desired.filter((d) => !have.has(d.sourceKey));
  if (toCreate.length > 0) {
    await prisma.adminNotification.createMany({
      data: toCreate.map((d) => ({ villageId, type, sourceKey: d.sourceKey, title: d.title, body: d.body, href: d.href, createdAt: d.createdAt })),
      skipDuplicates: true,
    });
  }

  for (const d of desired) {
    const cur = have.get(d.sourceKey);
    if (cur && (cur.title !== d.title || cur.body !== d.body || cur.href !== d.href)) {
      await prisma.adminNotification.update({
        where: { villageId_sourceKey: { villageId, sourceKey: d.sourceKey } },
        data: { title: d.title, body: d.body, href: d.href },
      });
    }
  }
}

/**
 * Sinkronkan baris AdminNotification dengan data terkini (permohonan pending,
 * transaksi & pembaruan warga terbaru). Aman dipanggil berulang (idempotent per sourceKey).
 * Dibatasi satu kali per desa per `NOTIFICATION_SYNC_TTL_MS`; panggilan serentak berbagi satu pekerjaan.
 */
export async function syncAdminNotificationsForVillage(villageId: number): Promise<void> {
  await syncThrottle.getOrLoad(villageId, async () => {
    // Baris yang ada dibaca SEKALI untuk ketiga tipe (bukan satu query per tipe), lalu hanya selisihnya yang ditulis.
    // Sengaja berurutan: paralel tidak mengurangi query dan menghabiskan pool koneksi (connection_limit kecil per worker).
    const mail = await desiredMailRequests(villageId);
    const finance = await desiredFinance(villageId);
    const residents = await desiredResidents(villageId);
    const existing = await prisma.adminNotification.findMany({
      where: { villageId, type: { in: [TYPE_MAIL, TYPE_FINANCE, TYPE_RESIDENT] } },
      select: { type: true, sourceKey: true, title: true, body: true, href: true },
    });
    const of = (type: string) => existing.filter((e) => e.type === type);
    await reconcileNotifications(villageId, TYPE_MAIL, mail, of(TYPE_MAIL));
    await reconcileNotifications(villageId, TYPE_FINANCE, finance, of(TYPE_FINANCE));
    await reconcileNotifications(villageId, TYPE_RESIDENT, residents, of(TYPE_RESIDENT));
  });
}

/** Hanya untuk tes: hapus pembatas agar sinkronisasi berikutnya langsung berjalan. */
export function resetNotificationSyncThrottle(): void {
  syncThrottle.clear();
}

async function desiredMailRequests(villageId: number): Promise<Desired[]> {
  // Hanya yang masih dalam jendela tampil dan sebanyak isi daftar lonceng; sisanya tetap ada di halaman permohonan.
  const pending = await prisma.mailRequest.findMany({
    where: { villageId, status: "pending", requestDate: { gte: notificationCutoffs().visibleSince } },
    orderBy: { requestDate: "desc" },
    take: NOTIFICATION_RETENTION.LIST_LIMIT,
    select: { id: true, name: true, mailType: true, requestDate: true },
  });
  return (
    pending.map((r) => ({
      sourceKey: `mail-req-${r.id}`,
      title: "Permohonan surat baru",
      body: `${r.name} mengajukan ${r.mailType}`,
      href: "/permohonan-warga",
      createdAt: r.requestDate,
    }))
  );
}

async function desiredFinance(villageId: number): Promise<Desired[]> {
  const txs = await prisma.transaction.findMany({
    where: { villageId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, type: true, category: true, description: true, createdAt: true },
  });
  return (
    txs.map((t) => {
      const isIncome = t.type === "income";
      return {
        sourceKey: `tx-${t.id}`,
        title: isIncome ? "Pemasukan keuangan" : "Pengeluaran keuangan",
        body: `${t.category}${t.description ? ` — ${t.description.slice(0, 120)}${t.description.length > 120 ? "…" : ""}` : ""}`,
        href: "/keuangan",
        createdAt: t.createdAt,
      };
    })
  );
}

async function desiredResidents(villageId: number): Promise<Desired[]> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const candidates = await prisma.resident.findMany({
    where: {
      villageId,
      updatedAt: { gte: since },
    },
    orderBy: { updatedAt: "desc" },
    take: 25,
    select: { id: true, name: true, nik: true, createdAt: true, updatedAt: true },
  });

  const updated = candidates
    .filter((r) => r.updatedAt.getTime() !== r.createdAt.getTime())
    .slice(0, 5);

  return (
    updated.map((r) => ({
      sourceKey: `resident-${r.id}`,
      title: "Data warga diperbarui",
      body: `${r.name} — NIK ${r.nik}`,
      href: "/data-warga",
      createdAt: r.updatedAt,
    }))
  );
}
