/**
 * Daftar wilayah (provinsi → kab/kota → kecamatan → desa/kelurahan) dari wilayah.id, dipakai pemilih desa di formulir
 * aspirasi. Dibaca server-side dengan cache panjang (data berubah sangat jarang). Gagal = daftar kosong; formulir
 * menyediakan isian manual sebagai cadangan.
 */
export type WilayahItem = { code: string; name: string };
export type WilayahLevel = "provinces" | "regencies" | "districts" | "villages";

const BASE = "https://wilayah.id/api";
const REVALIDATE_SEC = 30 * 24 * 60 * 60;

const CODE_RE: Record<WilayahLevel, RegExp> = {
  provinces: /^$/,
  regencies: /^\d{2}$/,
  districts: /^\d{2}\.\d{2}$/,
  villages: /^\d{2}\.\d{2}\.\d{2}$/,
};

export function isValidParent(level: WilayahLevel, parent: string): boolean {
  return CODE_RE[level].test(parent);
}

export function parseLevel(v: unknown): WilayahLevel | null {
  return v === "provinces" || v === "regencies" || v === "districts" || v === "villages" ? v : null;
}

export async function fetchWilayah(level: WilayahLevel, parent = "", fetcher: typeof fetch = fetch): Promise<WilayahItem[]> {
  if (!isValidParent(level, parent)) return [];
  const url = level === "provinces" ? `${BASE}/provinces.json` : `${BASE}/${level}/${parent}.json`;
  try {
    const res = await fetcher(url, { next: { revalidate: REVALIDATE_SEC } } as RequestInit);
    if (!res.ok) return [];
    const json = (await res.json().catch(() => null)) as { data?: Array<{ code?: unknown; name?: unknown }> } | null;
    return (json?.data ?? [])
      .filter((r): r is { code: string; name: string } => typeof r.code === "string" && typeof r.name === "string")
      .map((r) => ({ code: r.code, name: r.name.trim() }));
  } catch {
    return [];
  }
}

export type ResolvedVillage = {
  wilayahCode: string;
  kind: "desa" | "kelurahan";
  name: string;
  district: string;
  regency: string;
  province: string;
};

/** Kelurahan berkode belakang diawali 1, desa diawali 2 (konvensi kode Kemendagri). */
export function kindFromCode(code: string): "desa" | "kelurahan" {
  return code.split(".")[3]?.startsWith("1") ? "kelurahan" : "desa";
}

/**
 * Nama lengkap sebuah desa dari kodenya, diverifikasi ke sumber (bukan percaya nama dari klien) agar halaman desa
 * tidak bisa dibuat dengan nama palsu. null bila kode tidak dikenal atau sumber tidak terjangkau.
 */
export async function resolveVillageCode(code: string, fetcher: typeof fetch = fetch): Promise<ResolvedVillage | null> {
  const m = /^(\d{2})\.(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(code ?? "").trim());
  if (!m) return null;
  const [, p, k, c] = m;
  const prov = `${p}`;
  const reg = `${p}.${k}`;
  const dis = `${p}.${k}.${c}`;
  const full = m[0];
  const [provinces, regencies, districts, villages] = await Promise.all([
    fetchWilayah("provinces", "", fetcher),
    fetchWilayah("regencies", prov, fetcher),
    fetchWilayah("districts", reg, fetcher),
    fetchWilayah("villages", dis, fetcher),
  ]);
  const province = provinces.find((x) => x.code === prov)?.name;
  const regency = regencies.find((x) => x.code === reg)?.name;
  const district = districts.find((x) => x.code === dis)?.name;
  const village = villages.find((x) => x.code === full)?.name;
  if (!province || !regency || !district || !village) return null;
  return { wilayahCode: full, kind: kindFromCode(full), name: village, district, regency, province };
}
