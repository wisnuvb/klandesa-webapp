import { NextRequest } from "next/server";

export function getSubdomain(req: NextRequest): string | null {
  const hostname = req.headers.get("host") || "";

  // Remove port if present
  const host = hostname.split(":")[0];

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
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
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
