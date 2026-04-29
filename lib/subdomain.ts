import { NextRequest } from "next/server";

export function normalizeHostname(hostHeader: string | null): string {
  const hostname = String(hostHeader ?? "");
  return hostname.split(":")[0].trim().toLowerCase();
}

export function isIpAddress(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

export function getSubdomain(req: NextRequest): string | null {
  const host = normalizeHostname(req.headers.get("host"));

  // Split by dots
  const parts = host.split(".");

  // Handle localhost subdomains (for development)
  if (host.includes("localhost")) {
    // app.localhost, desa1.localhost, etc.
    if (parts.length > 1 && parts[0] !== "localhost") {
      return parts[0];
    }
    return null; // just localhost
  }

  // If IP address, no subdomain
  if (isIpAddress(host)) {
    return null;
  }

  // If only domain.com (2 parts) or domain.co.id (3 parts with known TLD), no subdomain
  if (parts.length === 2) return null;
  if (parts.length === 3 && ["co", "ac", "or", "go"].includes(parts[1]))
    return null;

  // Return first part as subdomain
  return parts[0];
}

export function isMainDomain(subdomain: string | null): boolean {
  return subdomain === null || subdomain === "www";
}

export function isAppSubdomain(subdomain: string | null): boolean {
  return subdomain === "app" || subdomain === "my";
}

export function isTenantSubdomain(subdomain: string | null): boolean {
  return (
    subdomain !== null &&
    subdomain !== "www" &&
    subdomain !== "app" &&
    subdomain !== "my"
  );
}

export function isAllowedMainHostname(hostname: string): boolean {
  if (!hostname) return true;
  if (hostname.includes("localhost")) return true;
  if (isIpAddress(hostname)) return true;
  const allow =
    process.env.MAIN_DOMAIN_ALLOWLIST ??
    "klandesa.id,www.klandesa.id,klandesa.com,www.klandesa.com";
  const allowed = allow
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(hostname);
}

export function isCustomDomainCandidateHost(hostname: string): boolean {
  if (!hostname) return false;
  if (hostname.includes("localhost")) return false;
  if (isIpAddress(hostname)) return false;
  if (isAllowedMainHostname(hostname)) return false;
  return true;
}
