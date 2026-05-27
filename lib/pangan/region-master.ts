import { PROVINSI_CODES } from "@/lib/pangan/match-region";

export type ProvinsiRow = { kode_provinsi: string; nama_provinsi: string };
export type KabKotaRow = { kode_kab_kota: string; nama_kab_kota: string };

export function extractArray<T = unknown>(payload: unknown): T[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as { data?: unknown };
  const d = p.data as { data?: unknown } | undefined;
  const arr = (d?.data ?? p.data) as unknown;
  return Array.isArray(arr) ? (arr as T[]) : [];
}

export function isWilayahCode(
  code: string,
  kind: "provinsi" | "kab_kota",
): boolean {
  const c = code.trim();
  if (kind === "provinsi") return /^[0-9]{2}$/.test(c);
  return /^[0-9]{2,4}$/.test(c);
}

export function findProvinsiByCode(kode: string): ProvinsiRow | null {
  return PROVINSI_CODES.find((p) => p.kode_provinsi === kode.trim()) ?? null;
}

export function findKabKotaByCode(
  list: KabKotaRow[],
  kode: string,
): KabKotaRow | null {
  return list.find((k) => k.kode_kab_kota === kode.trim()) ?? null;
}

export async function fetchKabKotaList(
  kodeProvinsi: string,
): Promise<KabKotaRow[]> {
  const kode = kodeProvinsi.trim();
  if (!isWilayahCode(kode, "provinsi")) return [];

  const url = `https://api-sp2kp.kemendag.go.id/master/api/wilayah/kab-kota/${encodeURIComponent(
    kode,
  )}?`;

  try {
    const upstream = await fetch(url, { method: "GET", cache: "no-store" });
    if (!upstream.ok) return [];
    const json = (await upstream.json().catch(() => null)) as unknown;
    return extractArray<KabKotaRow>(json);
  } catch {
    return [];
  }
}
