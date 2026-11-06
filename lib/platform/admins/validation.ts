import { normalizeAccountEmail } from "@/lib/rbac/accounts";

/** Validasi murni untuk pengelolaan admin platform (dipakai API dan tes). */

export const ADMIN_ACTIONS = ["deactivate", "activate", "force_logout", "reset_link", "resend_invite", "reset_2fa", "unlock"] as const;
export type AdminAction = (typeof ADMIN_ACTIONS)[number];

export function isAdminAction(v: unknown): v is AdminAction {
  return typeof v === "string" && (ADMIN_ACTIONS as readonly string[]).includes(v);
}

/** Alasan wajib 5–300 karakter (setelah dipangkas). Null bila tidak sah. */
export function parseReason(raw: unknown): string | null {
  const r = typeof raw === "string" ? raw.trim() : "";
  return r.length >= 5 && r.length <= 300 ? r : null;
}

export const REASON_ERROR = "Alasan wajib diisi (5–300 karakter).";

export function parseInviteInput(body: unknown): { ok: true; email: string; name: string } | { ok: false; error: string } {
  const b = (body ?? {}) as { email?: unknown; name?: unknown };
  const email = normalizeAccountEmail(b.email);
  if (!email) return { ok: false, error: "Masukkan alamat email yang valid." };
  const name = typeof b.name === "string" ? b.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2 || name.length > 100) return { ok: false, error: "Nama wajib diisi (2–100 karakter)." };
  if (/[<>]/.test(name)) return { ok: false, error: "Nama tidak boleh memuat tanda < atau >." };
  return { ok: true, email, name };
}

export function parsePositiveInt(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\d{1,9}$/.test(raw) ? Number(raw) : NaN;
  return Number.isInteger(n) && n > 0 && n < 2_000_000_000 ? n : null;
}
