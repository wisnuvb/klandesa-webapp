import { ROLE_LABELS } from "@/lib/rbac/labels";
import type { VillageRole } from "@/lib/permissions/client";

/** Tipe & helper klien Pusat Akun. Bentuk data mengikuti lib/platform/accounts/{search,detail}.ts. */

export type VillageRef = { id: number; code: string; name: string };
export type StaffRow = {
  kind: "staff"; id: number; name: string; emailMasked: string; role: string; village: VillageRef;
  status: "active" | "inactive"; lastLogin: string | null;
};
export type CitizenRow = {
  kind: "citizen"; id: number; name: string; username: string; village: VillageRef;
  status: "active" | "inactive" | "pending"; locked: boolean; lastLogin: string | null;
};
export type AccountRow = StaffRow | CitizenRow;
export type SearchResult = { rows: AccountRow[]; total: number; page: number; pageSize: number };

export type AuditEntry = { id: string; action: string; summary: string; actorEmail: string; createdAt: string; reason: string | null };
export type StaffDetail = {
  kind: "staff"; id: number; name: string; emailMasked: string; phoneMasked: string; role: string; isActive: boolean;
  lastLogin: string | null; createdAt: string; aiCredits: number;
  village: VillageRef & { isActive: boolean };
  activeMobileSessions: number;
  pendingTokens: { invite: { expiresAt: string } | null; reset: { expiresAt: string } | null };
  isLastActiveAdmin: boolean; audit: AuditEntry[];
};
export type CitizenDetail = {
  kind: "citizen"; id: number; name: string; username: string; status: string; signupMethod: string; failedAttempts: number;
  lockedUntil: string | null; lastLogin: string | null; createdAt: string; deleted: boolean; residentId: number;
  village: VillageRef & { isActive: boolean };
  activeMobileSessions: number; pendingResetCode: { expiresAt: string } | null; audit: AuditEntry[];
};
export type AccountDetail = StaffDetail | CitizenDetail;

export type ResidentRow = {
  id: number; name: string; nikMasked: string; phoneMasked: string; gender: string; isAlive: boolean;
  village: VillageRef; hasCitizenAccount: boolean;
};

/** fetch JSON; melempar Error(pesan Indonesia dari server) bila gagal. */
export async function apiJson<T>(url: string, init?: RequestInit & { signal?: AbortSignal }): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) {
    const err = new Error(data?.error || (res.status === 401 ? "Sesi berakhir. Muat ulang halaman dan masuk kembali." : "Permintaan gagal. Coba lagi.")) as Error & { code?: string };
    err.code = (data as { code?: string } | null)?.code;
    throw err;
  }
  return data as T;
}

export async function postAction<T = Record<string, unknown>>(url: string, body: Record<string, unknown>): Promise<T> {
  return apiJson<T>(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "-" : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export const roleLabel = (role: string) => ROLE_LABELS[role as VillageRole] ?? role;

export const ACTION_LABEL: Record<string, string> = {
  "account.reset_link": "Kirim tautan atur sandi",
  "account.deactivate": "Nonaktifkan / bekukan akun",
  "account.activate": "Aktifkan kembali akun",
  "account.force_logout": "Paksa keluar",
  "account.change_email": "Ubah email",
  "account.ai_credits": "Ubah kredit AI",
  "account.unlock": "Buka pembatas login",
  "citizen.unlock": "Buka kunci login warga",
  "citizen.reset_code": "Terbitkan kode reset sandi",
  "resident.view_sensitive": "Buka data lengkap warga",
};
export const actionLabel = (a: string) => ACTION_LABEL[a] ?? a;
