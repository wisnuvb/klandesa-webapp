/**
 * Sinkronisasi cermin pangan (dipanggil cron `sync-pangan` dan skrip `scripts/sync-pangan.ts`).
 *
 * Idempoten dan bisa dilanjutkan: hanya baris yang kedaluwarsa (lihat TTL di mirror-policy) yang
 * diambil ulang, dan pekerjaan berhenti rapi saat batas waktu habis — run berikutnya meneruskan sisanya.
 *
 * Catatan sumber: SP2KP tertinggal beberapa hari (mis. akhir pekan kosong), jadi tanggal yang
 * di-prefetch bukan "kemarin" melainkan tanggal terbaru yang sudah punya data (dicari lewat HET nasional,
 * yang hanya butuh satu panggilan per tanggal).
 */
import { prisma } from "@/lib/prisma";
import { matchKabKotaCode, matchProvinceCode, PROVINSI_CODES } from "@/lib/pangan/match-region";
import { parseWilayahSettings } from "@/lib/village/wilayah-settings";
import type { Mirror, SnapshotKey } from "./mirror";
import { addDaysIso, hasHetData, MAX_HISTORY_DAYS, todayWib } from "./mirror-policy";
import { SYNC_BUDGET } from "./sp2kp-client";

export type KabTarget = { kodeProvinsi: string; kodeKabKota: string };

export type SyncScope = "all" | "wilayah" | "harga";

export type SyncOptions = {
  scope?: SyncScope;
  force?: boolean;
  /** Batas waktu kerja (ms) sebelum berhenti rapi. */
  deadlineMs?: number;
  concurrency?: number;
};

export type SyncDeps = {
  mirror: Mirror;
  now?: () => Date;
  loadTargets?: () => Promise<KabTarget[]>;
  purgeOld?: (cutoffDate: string) => Promise<number>;
  sleep?: (ms: number) => Promise<void>;
};

export type SyncReport = {
  startedAt: string;
  durationMs: number;
  incomplete: boolean;
  wilayah?: { total: number; fresh: number; refreshed: number; failed: number; errors: string[] };
  latestDataDate: string | null;
  harga?: {
    targets: number;
    tasks: number;
    fresh: number;
    refreshed: number;
    failed: number;
    skipped: number;
  };
  purged?: number;
};

/** Selisih hari pembanding yang di-prefetch (H-7 = bawaan halaman, H-1 = tombol cepat). */
export const PREFETCH_COMPARE_DAYS = [7, 1] as const;
/** Berapa hari ke belakang dicari tanggal terbaru yang sudah punya data. */
export const LATEST_LOOKBACK_DAYS = 10;
const CALL_GAP_MS = 150;

const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function shuffle<T>(items: T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Jalankan `worker` untuk tiap item dengan batas paralel; berhenti mengambil item baru setelah `deadline`. */
export async function runPool<T>(
  items: T[],
  concurrency: number,
  deadline: number,
  worker: (item: T) => Promise<void>,
  nowMs: () => number = Date.now,
): Promise<{ done: number; skipped: number }> {
  let next = 0;
  let done = 0;
  async function lane() {
    while (next < items.length) {
      if (nowMs() >= deadline) return;
      const item = items[next++];
      await worker(item);
      done++;
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, lane));
  return { done, skipped: items.length - done };
}

/** Tanggal terbaru (mundur dari hari ini WIB) yang HET nasionalnya sudah ada; null bila tak ditemukan. */
export async function discoverLatestDataDate(
  mirror: Mirror,
  today: string,
  lookbackDays: number = LATEST_LOOKBACK_DAYS,
): Promise<string | null> {
  for (let i = 0; i <= lookbackDays; i++) {
    const d = addDaysIso(today, -i);
    const r = await mirror.getHet(d, SYNC_BUDGET);
    if (hasHetData(r.payload)) return d;
  }
  return null;
}

export function buildPrefetchKeys(targets: KabTarget[], latest: string): SnapshotKey[] {
  const keys: SnapshotKey[] = [];
  for (const t of targets) {
    for (const days of PREFETCH_COMPARE_DAYS) {
      keys.push({
        kind: "harga",
        kodeProvinsi: t.kodeProvinsi,
        kodeKabKota: t.kodeKabKota,
        tanggal: latest,
        tanggalPembanding: addDaysIso(latest, -days),
      });
    }
  }
  return keys;
}

/** Kab/kota yang dipakai desa terdaftar (kode tersimpan di settings, atau dicocokkan dari teks profil), plus tambahan dari env. */
export async function loadVillageTargets(): Promise<KabTarget[]> {
  const found = new Map<string, string>();
  const add = (prov: string, kab: string) => {
    if (/^[0-9]{2}$/.test(prov) && /^[0-9]{4}$/.test(kab) && kab.startsWith(prov)) found.set(kab, prov);
  };

  const villages = await prisma.village.findMany({
    select: { province: true, regency: true, settings: true },
  });
  const wilayahCache = new Map<string, { kode_kab_kota: string; nama_kab_kota: string }[]>();

  for (const v of villages) {
    const stored = parseWilayahSettings(v.settings);
    if (stored.kode_provinsi && stored.kode_kab_kota) {
      add(stored.kode_provinsi, stored.kode_kab_kota);
      continue;
    }
    const prov = matchProvinceCode(v.province);
    if (!prov) continue;
    let list = wilayahCache.get(prov);
    if (!list) {
      const rows = await prisma.panganWilayah.findMany({ where: { kodeProvinsi: prov, isActive: true } });
      list = rows.map((r) => ({ kode_kab_kota: r.kodeKabKota, nama_kab_kota: r.nama }));
      wilayahCache.set(prov, list);
    }
    const kab = matchKabKotaCode(v.regency, list);
    if (kab) add(prov, kab);
  }

  for (const kab of (process.env.PANGAN_PREFETCH_EXTRA ?? "").split(",")) {
    const k = kab.trim();
    if (k) add(k.slice(0, 2), k);
  }

  return [...found.entries()].map(([kodeKabKota, kodeProvinsi]) => ({ kodeProvinsi, kodeKabKota }));
}

export async function purgeOldSnapshots(cutoffDate: string): Promise<number> {
  const r = await prisma.panganHargaSnapshot.deleteMany({ where: { tanggal: { lt: cutoffDate } } });
  return r.count;
}

export async function syncPangan(opts: SyncOptions, deps: SyncDeps): Promise<SyncReport> {
  const { mirror } = deps;
  const now = deps.now ?? (() => new Date());
  const sleep = deps.sleep ?? realSleep;
  const scope = opts.scope ?? "all";
  const concurrency = opts.concurrency ?? 3;
  const start = now().getTime();
  const deadline = start + (opts.deadlineMs ?? 45_000);
  const report: SyncReport = {
    startedAt: new Date(start).toISOString(),
    durationMs: 0,
    incomplete: false,
    latestDataDate: null,
  };

  if (scope === "all" || scope === "wilayah") {
    const w = { total: PROVINSI_CODES.length, fresh: 0, refreshed: 0, failed: 0, errors: [] as string[] };
    const { skipped } = await runPool(
      shuffle(PROVINSI_CODES),
      concurrency,
      deadline,
      async (p) => {
        const r = await mirror.ensureWilayah(p.kode_provinsi, SYNC_BUDGET, opts.force === true);
        w[r.status]++;
        if (r.status === "failed" && w.errors.length < 5) w.errors.push(`${p.kode_provinsi}: ${r.error ?? "gagal"}`);
        if (r.status === "refreshed") await sleep(CALL_GAP_MS);
      },
      () => now().getTime(),
    );
    if (skipped > 0) report.incomplete = true;
    report.wilayah = w;
  }

  if (scope === "all" || scope === "harga") {
    const today = todayWib(now());
    let latest: string | null = null;
    try {
      latest = await discoverLatestDataDate(mirror, today);
    } catch {
      latest = null;
    }
    report.latestDataDate = latest;

    const targets = await (deps.loadTargets ?? loadVillageTargets)();
    const h = { targets: targets.length, tasks: 0, fresh: 0, refreshed: 0, failed: 0, skipped: 0 };
    if (latest) {
      const keys = shuffle(buildPrefetchKeys(targets, latest));
      h.tasks = keys.length;
      const { skipped } = await runPool(
        keys,
        concurrency,
        deadline,
        async (key) => {
          const r = await mirror.ensureSnapshot(key, SYNC_BUDGET);
          h[r]++;
          if (r === "refreshed") await sleep(CALL_GAP_MS);
        },
        () => now().getTime(),
      );
      h.skipped = skipped;
      if (skipped > 0) report.incomplete = true;
    } else {
      report.incomplete = true;
    }
    report.harga = h;
  }

  if (scope === "all") {
    const purge = deps.purgeOld ?? purgeOldSnapshots;
    report.purged = await purge(addDaysIso(todayWib(now()), -MAX_HISTORY_DAYS));
  }

  report.durationMs = now().getTime() - start;
  return report;
}
