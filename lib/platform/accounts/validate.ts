/** Validasi input Pusat Akun (fungsi murni, tanpa DB). Pesan galat Bahasa Indonesia. */

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export type AccountKind = "staff" | "citizen";
export type AccountTypeFilter = AccountKind | "all";
export type AccountStatusFilter = "active" | "inactive" | "pending" | "locked";

export const PAGE_SIZE = 25;
export const MAX_PAGE = 400;
export const MAX_AI_CREDITS = 1_000_000_000;

export function parseAccountKind(raw: unknown): AccountKind | null {
  return raw === "staff" || raw === "citizen" ? raw : null;
}

export function parseId(raw: unknown): number | null {
  const s = typeof raw === "string" ? raw : typeof raw === "number" ? String(raw) : "";
  if (!/^[0-9]{1,10}$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) && n > 0 && n <= 2_147_483_647 ? n : null;
}

/** Alasan wajib 5-300 karakter (setelah trim). */
export function parseReason(raw: unknown): Parsed<string> {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (v.length < 5) return { ok: false, error: "Alasan wajib diisi (minimal 5 karakter)." };
  if (v.length > 300) return { ok: false, error: "Alasan terlalu panjang (maksimal 300 karakter)." };
  return { ok: true, value: v };
}

export type AccountSearch = {
  q: string;
  type: AccountTypeFilter;
  villageId: number | null;
  status: AccountStatusFilter | null;
  page: number;
};

export function parseAccountSearch(sp: URLSearchParams): Parsed<AccountSearch> {
  const q = (sp.get("q") ?? "").trim().slice(0, 100);
  const typeRaw = sp.get("type") ?? "all";
  if (typeRaw !== "all" && typeRaw !== "staff" && typeRaw !== "citizen") return { ok: false, error: "Jenis akun tidak valid." };
  const statusRaw = sp.get("status") ?? "";
  let status: AccountStatusFilter | null = null;
  if (statusRaw) {
    if (!["active", "inactive", "pending", "locked"].includes(statusRaw)) return { ok: false, error: "Status tidak valid." };
    status = statusRaw as AccountStatusFilter;
  }
  const vRaw = sp.get("villageId");
  let villageId: number | null = null;
  if (vRaw) {
    villageId = parseId(vRaw);
    if (villageId == null) return { ok: false, error: "Desa tidak valid." };
  }
  const pRaw = sp.get("page");
  let page = 1;
  if (pRaw) {
    if (!/^[0-9]{1,4}$/.test(pRaw) || Number(pRaw) < 1 || Number(pRaw) > MAX_PAGE) return { ok: false, error: "Halaman tidak valid." };
    page = Number(pRaw);
  }
  return { ok: true, value: { q, type: typeRaw, villageId, status, page } };
}

export type ResidentSearch = { q: string; villageId: number | null; mode: "nik" | "name" };

export const isFullNik = (q: string) => /^[0-9]{16}$/.test(q);

/** Pencarian warga: NIK hanya cocok-persis 16 digit; nama minimal 3 karakter (awalan). Pencarian terlalu longgar ditolak. */
export function parseResidentSearch(sp: URLSearchParams): Parsed<ResidentSearch> {
  const q = (sp.get("q") ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
  const vRaw = sp.get("villageId");
  let villageId: number | null = null;
  if (vRaw) {
    villageId = parseId(vRaw);
    if (villageId == null) return { ok: false, error: "Desa tidak valid." };
  }
  if (isFullNik(q.replace(/\s/g, ""))) return { ok: true, value: { q: q.replace(/\s/g, ""), villageId, mode: "nik" } };
  if (/^[0-9]+$/.test(q.replace(/\s/g, "")) && q.length > 0) {
    return { ok: false, error: "Pencarian NIK harus tepat 16 digit. Pencarian sebagian tidak diizinkan." };
  }
  if (q.length < 3) return { ok: false, error: "Ketik minimal 3 huruf nama, atau NIK 16 digit." };
  return { ok: true, value: { q, villageId, mode: "name" } };
}

/** Kontrak sama dengan rute lama /users/[id]/ai-credits: { set } atau { delta } (angka, dibulatkan ke bawah). */
export type AiCreditsInput = { kind: "set"; value: number } | { kind: "delta"; value: number };

export function parseAiCreditsInput(body: unknown): Parsed<AiCreditsInput> {
  if (!body || typeof body !== "object") return { ok: false, error: "Body tidak valid" };
  const b = body as { delta?: unknown; set?: unknown };
  const num = (v: unknown) => (v == null || v === "" ? null : typeof v === "number" || typeof v === "string" ? Number(v) : NaN);
  const set = num(b.set);
  const delta = num(b.delta);
  if (set == null && delta == null) return { ok: false, error: "Body harus berisi set atau delta" };
  if (set != null) {
    if (!Number.isFinite(set)) return { ok: false, error: "set tidak valid" };
    const v = Math.max(0, Math.floor(set));
    if (v > MAX_AI_CREDITS) return { ok: false, error: "Nilai kredit terlalu besar." };
    return { ok: true, value: { kind: "set", value: v } };
  }
  if (!Number.isFinite(delta as number)) return { ok: false, error: "delta tidak valid" };
  const d = Math.floor(delta as number);
  if (Math.abs(d) > MAX_AI_CREDITS) return { ok: false, error: "Nilai kredit terlalu besar." };
  return { ok: true, value: { kind: "delta", value: d } };
}

/** Referensi target di jejak audit. Akun staf = id polos; akun warga mobile = "citizen:<id>". */
export function auditRef(kind: AccountKind, id: number): { targetType: "user"; targetId: string } {
  return { targetType: "user", targetId: kind === "citizen" ? `citizen:${id}` : String(id) };
}
