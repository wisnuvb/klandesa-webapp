import { prisma } from "@/lib/prisma";
import type { KabKotaRow, MirrorStore, SnapshotKey } from "./mirror";

const uniqueKey = (k: SnapshotKey) => ({
  kind_kodeProvinsi_kodeKabKota_tanggal_tanggalPembanding: {
    kind: k.kind,
    kodeProvinsi: k.kodeProvinsi,
    kodeKabKota: k.kodeKabKota,
    tanggal: k.tanggal,
    tanggalPembanding: k.tanggalPembanding,
  },
});

export const prismaMirrorStore: MirrorStore = {
  async getSnapshot(key) {
    const row = await prisma.panganHargaSnapshot.findUnique({ where: uniqueKey(key) });
    if (!row) return null;
    return {
      payload: row.payload,
      hasData: row.hasData,
      fetchedAt: row.fetchedAt,
      lastAttemptAt: row.lastAttemptAt,
    };
  },

  async saveSnapshot(key, row) {
    await prisma.panganHargaSnapshot.upsert({
      where: uniqueKey(key),
      create: {
        ...key,
        payload: row.payload as object,
        hasData: row.hasData,
        fetchedAt: row.at,
        lastAttemptAt: row.at,
        lastError: null,
      },
      update: {
        payload: row.payload as object,
        hasData: row.hasData,
        fetchedAt: row.at,
        lastAttemptAt: row.at,
        lastError: null,
      },
    });
  },

  async markAttempt(key, at, error) {
    await prisma.panganHargaSnapshot.updateMany({
      where: { ...key },
      data: { lastAttemptAt: at, lastError: error ? error.slice(0, 300) : null },
    });
  },

  async getWilayah(kodeProvinsi) {
    const rows = await prisma.panganWilayah.findMany({
      where: { kodeProvinsi, isActive: true },
      orderBy: { kodeKabKota: "asc" },
    });
    let oldest: Date | null = null;
    for (const r of rows) if (!oldest || r.fetchedAt < oldest) oldest = r.fetchedAt;
    return {
      rows: rows.map<KabKotaRow>((r) => ({ kode_kab_kota: r.kodeKabKota, nama_kab_kota: r.nama })),
      oldestFetchedAt: oldest,
    };
  },

  async replaceWilayah(kodeProvinsi, rows, at) {
    const codes = rows.map((r) => r.kode_kab_kota);
    const results = await prisma.$transaction([
      ...rows.map((r) =>
        prisma.panganWilayah.upsert({
          where: { kodeProvinsi_kodeKabKota: { kodeProvinsi, kodeKabKota: r.kode_kab_kota } },
          create: { kodeProvinsi, kodeKabKota: r.kode_kab_kota, nama: r.nama_kab_kota, isActive: true, fetchedAt: at },
          update: { nama: r.nama_kab_kota, isActive: true, fetchedAt: at },
        }),
      ),
      prisma.panganWilayah.updateMany({
        where: { kodeProvinsi, isActive: true, kodeKabKota: { notIn: codes } },
        data: { isActive: false },
      }),
    ]);
    const deactivated = (results[results.length - 1] as { count: number }).count;
    return { upserted: rows.length, deactivated };
  },
};
