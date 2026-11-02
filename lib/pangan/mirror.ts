/**
 * Cermin data SP2KP: baca dari DB kita, ambil dari Kemendag hanya bila perlu.
 *
 * Alur baca satu kunci:
 *  1. Ada & masih segar (TTL, lihat mirror-policy) → langsung dari DB.
 *  2. Ada tapi kedaluwarsa → coba segarkan dengan anggaran waktu pendek; bila gagal (atau sedang
 *     masa tenang setelah gagal) sajikan data lama dengan penanda `stale`.
 *  3. Belum ada → ambil langsung (anggaran LIVE); bila gagal lempar `MirrorError` (504 timeout / 502).
 *
 * Inti ini tidak mengimpor Prisma; penyimpanan disuntik lewat `MirrorStore` supaya bisa dites.
 */
import {
  FOREGROUND_BUDGET,
  LIVE_BUDGET,
  Sp2kpError,
  sp2kpJson,
  type Sp2kpBudget,
  type Sp2kpRequest,
} from "./sp2kp-client";
import {
  hasHargaData,
  hasHetData,
  isStandardPair,
  RETRY_COOLDOWN_MS,
  snapshotTtlMs,
  WILAYAH_TTL_MS,
} from "./mirror-policy";

export type SnapshotKey = {
  kind: "harga" | "het";
  kodeProvinsi: string;
  kodeKabKota: string;
  tanggal: string;
  tanggalPembanding: string;
};

export type SnapshotRow = {
  payload: unknown;
  hasData: boolean;
  fetchedAt: Date;
  lastAttemptAt: Date | null;
};

export type KabKotaRow = { kode_kab_kota: string; nama_kab_kota: string };

export interface MirrorStore {
  getSnapshot(key: SnapshotKey): Promise<SnapshotRow | null>;
  saveSnapshot(key: SnapshotKey, row: { payload: unknown; hasData: boolean; at: Date }): Promise<void>;
  /** Catat percobaan (berhasil/gagal) tanpa mengubah payload. Tidak membuat baris baru. */
  markAttempt(key: SnapshotKey, at: Date, error: string | null): Promise<void>;
  /** Kab/kota aktif satu provinsi + waktu ambil TERTUA di antaranya (null bila kosong). */
  getWilayah(kodeProvinsi: string): Promise<{ rows: KabKotaRow[]; oldestFetchedAt: Date | null }>;
  replaceWilayah(
    kodeProvinsi: string,
    rows: KabKotaRow[],
    at: Date,
  ): Promise<{ upserted: number; deactivated: number }>;
}

export class MirrorError extends Error {
  readonly status: 502 | 504;
  constructor(status: 502 | 504, message: string) {
    super(message);
    this.name = "MirrorError";
    this.status = status;
  }
}

export type MirrorSource = "db" | "live" | "stale";

export type MirrorResult = {
  payload: Record<string, unknown>;
  fetchedAt: Date;
  stale: boolean;
  source: MirrorSource;
};

export type MirrorDeps = {
  store: MirrorStore;
  now?: () => Date;
  /** Hanya untuk tes: ganti pemanggil sumber. */
  fetchJson?: typeof sp2kpJson;
};

const HARGA_PATH = "/report/api/average-price/generate-perbandingan-harga";
const HET_PATH = "/report/api/average-price/generate-perbandingan-harga-het-ha";
const wilayahPath = (prov: string) => `/master/api/wilayah/kab-kota/${encodeURIComponent(prov)}?`;

export function snapshotKeyString(k: SnapshotKey): string {
  return [k.kind, k.kodeProvinsi, k.kodeKabKota, k.tanggal, k.tanggalPembanding].join("|");
}

export function toMirrorError(e: unknown): MirrorError {
  if (e instanceof MirrorError) return e;
  if (e instanceof Sp2kpError && e.kind === "timeout") {
    return new MirrorError(504, "Server sumber tidak merespons tepat waktu");
  }
  return new MirrorError(502, "Gagal mengambil data dari server sumber");
}

/** Normalisasi baris kab/kota dari payload sumber; baris cacat dibuang. */
export function parseKabKotaRows(payload: unknown): KabKotaRow[] {
  const rows = (() => {
    if (!payload || typeof payload !== "object") return [] as unknown[];
    const d = (payload as { data?: unknown }).data;
    return Array.isArray(d) ? d : [];
  })();
  const out: KabKotaRow[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const kode = String((r as Record<string, unknown>).kode_kab_kota ?? "").trim();
    const nama = String((r as Record<string, unknown>).nama_kab_kota ?? "").trim();
    if (!/^[0-9]{4}$/.test(kode) || !nama || seen.has(kode)) continue;
    seen.add(kode);
    out.push({ kode_kab_kota: kode, nama_kab_kota: nama.slice(0, 160) });
  }
  return out;
}

export function kabKotaPayload(rows: KabKotaRow[]): Record<string, unknown> {
  return { status: "success", message: "Data dari cermin Klandesa", data: rows };
}

export function createMirror(deps: MirrorDeps) {
  const { store } = deps;
  const now = deps.now ?? (() => new Date());
  const fetchJson = deps.fetchJson ?? sp2kpJson;
  const inFlight = new Map<string, Promise<unknown>>();
  const wilayahAttempt = new Map<string, number>();

  function once<T>(key: string, run: () => Promise<T>): Promise<T> {
    const existing = inFlight.get(key) as Promise<T> | undefined;
    if (existing) return existing;
    const p = run().finally(() => inFlight.delete(key));
    inFlight.set(key, p);
    return p;
  }

  function snapshotRequest(key: SnapshotKey): Sp2kpRequest {
    if (key.kind === "het") {
      return { path: HET_PATH, method: "POST", form: { tanggal: key.tanggal } };
    }
    return {
      path: HARGA_PATH,
      method: "POST",
      form: {
        tanggal: key.tanggal,
        tanggal_pembanding: key.tanggalPembanding,
        kode_provinsi: key.kodeProvinsi,
        kode_kab_kota: key.kodeKabKota,
      },
    };
  }

  /**
   * Ambil dari sumber lalu simpan. Mengembalikan baris tersimpan. Bila sumber kini kosong padahal
   * kita sudah punya data, data lama dipertahankan (sumber sesekali menjawab kosong sementara).
   */
  function refreshSnapshot(
    key: SnapshotKey,
    budget: Sp2kpBudget,
    existing: SnapshotRow | null,
  ): Promise<{ payload: Record<string, unknown>; fetchedAt: Date; kept: boolean }> {
    return once(`snap:${snapshotKeyString(key)}`, async () => {
      const at = now();
      let payload: Record<string, unknown>;
      try {
        payload = await fetchJson({ ...snapshotRequest(key), budget });
      } catch (e) {
        const err = e instanceof Error ? e.message : "gagal";
        await store.markAttempt(key, at, err.slice(0, 300)).catch(() => undefined);
        throw e;
      }
      const hasData = key.kind === "het" ? hasHetData(payload) : hasHargaData(payload);
      if (existing?.hasData && !hasData) {
        await store
          .markAttempt(key, at, "sumber mengembalikan data kosong; data lama dipertahankan")
          .catch(() => undefined);
        return { payload: existing.payload as Record<string, unknown>, fetchedAt: existing.fetchedAt, kept: true };
      }
      await store.saveSnapshot(key, { payload, hasData, at });
      return { payload, fetchedAt: at, kept: false };
    });
  }

  async function readSnapshot(key: SnapshotKey, liveBudget: Sp2kpBudget = LIVE_BUDGET): Promise<MirrorResult> {
    const row = await store.getSnapshot(key);
    const t = now();

    if (row) {
      const ttl = snapshotTtlMs({ hasData: row.hasData, tanggal: key.tanggal, now: t });
      if (t.getTime() - row.fetchedAt.getTime() < ttl) {
        return { payload: row.payload as Record<string, unknown>, fetchedAt: row.fetchedAt, stale: false, source: "db" };
      }
      const cooling =
        row.lastAttemptAt !== null && t.getTime() - row.lastAttemptAt.getTime() < RETRY_COOLDOWN_MS;
      if (!cooling) {
        try {
          const fresh = await refreshSnapshot(key, FOREGROUND_BUDGET, row);
          return {
            payload: fresh.payload,
            fetchedAt: fresh.fetchedAt,
            stale: fresh.kept,
            source: fresh.kept ? "stale" : "live",
          };
        } catch {
          /* jatuh ke data lama di bawah */
        }
      }
      return { payload: row.payload as Record<string, unknown>, fetchedAt: row.fetchedAt, stale: true, source: "stale" };
    }

    try {
      const fresh = await refreshSnapshot(key, liveBudget, null);
      return { payload: fresh.payload, fetchedAt: fresh.fetchedAt, stale: false, source: "live" };
    } catch (e) {
      throw toMirrorError(e);
    }
  }

  /** Ambil dari sumber dan simpan ke tabel wilayah. Menolak daftar yang menyusut drastis. */
  function refreshWilayah(kodeProvinsi: string, budget: Sp2kpBudget): Promise<{ rows: KabKotaRow[]; fetchedAt: Date }> {
    return once(`wil:${kodeProvinsi}`, async () => {
      wilayahAttempt.set(kodeProvinsi, now().getTime());
      const payload = await fetchJson({ path: wilayahPath(kodeProvinsi), method: "GET", budget });
      const rows = parseKabKotaRows(payload);
      if (rows.length === 0) throw new Sp2kpError("invalid", "Daftar kab/kota dari sumber kosong");
      const current = await store.getWilayah(kodeProvinsi);
      if (current.rows.length >= 4 && rows.length < current.rows.length * 0.5) {
        throw new Sp2kpError(
          "invalid",
          `Daftar kab/kota menyusut (${current.rows.length} → ${rows.length}); tidak ditimpa`,
        );
      }
      const at = now();
      await store.replaceWilayah(kodeProvinsi, rows, at);
      return { rows, fetchedAt: at };
    });
  }

  async function readKabKota(kodeProvinsi: string): Promise<{
    rows: KabKotaRow[];
    fetchedAt: Date;
    stale: boolean;
    source: MirrorSource;
  }> {
    const cur = await store.getWilayah(kodeProvinsi);
    const t = now().getTime();

    if (cur.rows.length > 0 && cur.oldestFetchedAt) {
      if (t - cur.oldestFetchedAt.getTime() < WILAYAH_TTL_MS) {
        return { rows: cur.rows, fetchedAt: cur.oldestFetchedAt, stale: false, source: "db" };
      }
      const last = wilayahAttempt.get(kodeProvinsi) ?? 0;
      if (t - last >= RETRY_COOLDOWN_MS) {
        try {
          const fresh = await refreshWilayah(kodeProvinsi, FOREGROUND_BUDGET);
          return { rows: fresh.rows, fetchedAt: fresh.fetchedAt, stale: false, source: "live" };
        } catch {
          /* sajikan data lama */
        }
      }
      return { rows: cur.rows, fetchedAt: cur.oldestFetchedAt, stale: true, source: "stale" };
    }

    try {
      const fresh = await refreshWilayah(kodeProvinsi, LIVE_BUDGET);
      return { rows: fresh.rows, fetchedAt: fresh.fetchedAt, stale: false, source: "live" };
    } catch (e) {
      throw toMirrorError(e);
    }
  }

  return {
    async getHarga(input: { tanggal: string; tanggalPembanding: string; kodeProvinsi: string; kodeKabKota: string }): Promise<MirrorResult> {
      const key: SnapshotKey = { kind: "harga", ...input };
      if (isStandardPair(input.tanggal, input.tanggalPembanding)) return readSnapshot(key);
      // Pasangan tanggal bebas: layani langsung dari sumber, tidak disimpan.
      try {
        const payload = await once(`live:${snapshotKeyString(key)}`, () =>
          fetchJson({ ...snapshotRequest(key), budget: LIVE_BUDGET }),
        );
        return { payload, fetchedAt: now(), stale: false, source: "live" };
      } catch (e) {
        throw toMirrorError(e);
      }
    },
    /** false hanya bila daftar provinsi itu sudah ada di cermin dan kab/kota tidak termasuk di dalamnya. */
    async isKnownKabKota(kodeProvinsi: string, kodeKabKota: string): Promise<boolean> {
      if (!kodeKabKota.startsWith(kodeProvinsi)) return false;
      const cur = await store.getWilayah(kodeProvinsi);
      if (cur.rows.length === 0) return true;
      return cur.rows.some((r) => r.kode_kab_kota === kodeKabKota);
    },
    getHet(tanggal: string, budget?: Sp2kpBudget) {
      return readSnapshot(
        { kind: "het", kodeProvinsi: "", kodeKabKota: "", tanggal, tanggalPembanding: "" },
        budget,
      );
    },
    getKabKota: readKabKota,

    /** Untuk cron: segarkan hanya bila kedaluwarsa. Mengembalikan apa yang terjadi. */
    async ensureSnapshot(key: SnapshotKey, budget: Sp2kpBudget): Promise<"fresh" | "refreshed" | "failed"> {
      const row = await store.getSnapshot(key);
      const t = now();
      if (row) {
        const ttl = snapshotTtlMs({ hasData: row.hasData, tanggal: key.tanggal, now: t });
        if (t.getTime() - row.fetchedAt.getTime() < ttl) return "fresh";
      }
      try {
        await refreshSnapshot(key, budget, row);
        return "refreshed";
      } catch {
        return "failed";
      }
    },

    /** Untuk cron: segarkan daftar satu provinsi bila kedaluwarsa (atau `force`). */
    async ensureWilayah(
      kodeProvinsi: string,
      budget: Sp2kpBudget,
      force: boolean,
    ): Promise<{ status: "fresh" | "refreshed" | "failed"; error?: string }> {
      const cur = await store.getWilayah(kodeProvinsi);
      if (
        !force &&
        cur.rows.length > 0 &&
        cur.oldestFetchedAt &&
        now().getTime() - cur.oldestFetchedAt.getTime() < WILAYAH_TTL_MS
      ) {
        return { status: "fresh" };
      }
      try {
        await refreshWilayah(kodeProvinsi, budget);
        return { status: "refreshed" };
      } catch (e) {
        return { status: "failed", error: e instanceof Error ? e.message : "gagal" };
      }
    },
  };
}

export type Mirror = ReturnType<typeof createMirror>;
