import { randomBytes } from "crypto";

const SUBDOMAIN_LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const HOSTNAME_RE = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export function normalizeHostname(hostname: string): string {
  return String(hostname || "")
    .trim()
    .toLowerCase()
    .split(":")[0];
}

export function validateSubdomainLabel(
  label: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const v = String(label || "").trim().toLowerCase();
  if (!v) return { ok: false, error: "Subdomain wajib diisi" };
  if (v.length < 2) return { ok: false, error: "Subdomain terlalu pendek" };
  if (v.length > 63) return { ok: false, error: "Subdomain terlalu panjang" };
  if (!SUBDOMAIN_LABEL_RE.test(v)) {
    return {
      ok: false,
      error:
        "Format subdomain tidak valid (hanya huruf kecil, angka, dan tanda hubung; tidak boleh diawali/diakhiri '-')",
    };
  }
  const reserved = new Set([
    "www",
    "app",
    "my",
    "api",
    "admin",
    "static",
    "assets",
  ]);
  if (reserved.has(v)) return { ok: false, error: "Subdomain tidak tersedia" };
  return { ok: true, value: v };
}

export function validateHostnameFqdn(
  hostname: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const v = normalizeHostname(hostname);
  if (!v) return { ok: false, error: "Domain wajib diisi" };
  if (v.includes("localhost")) {
    return { ok: false, error: "Custom domain tidak boleh localhost" };
  }
  if (!HOSTNAME_RE.test(v)) {
    return { ok: false, error: "Format domain tidak valid" };
  }
  return { ok: true, value: v };
}

export function generateVerificationToken(): string {
  return randomBytes(18).toString("hex");
}

export function buildDnsTxtVerificationName(hostname: string): string {
  const h = normalizeHostname(hostname);
  return `_klandesa-verify.${h}`;
}

