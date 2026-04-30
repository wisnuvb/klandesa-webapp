export const DEFAULT_SITE_URL = "https://klandesa.com";

export function getMainSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  try {
    return new URL(raw).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

export function hostToOrigin(host: string | null | undefined, proto?: string): string | null {
  if (!host) return null;
  const safeHost = host.split(":")[0]?.trim();
  if (!safeHost) return null;
  const safeProto = proto === "https" ? "https" : "http";
  return `${safeProto}://${safeHost}`;
}

export function joinUrl(origin: string, pathname: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(normalizedPath, origin).toString();
}
