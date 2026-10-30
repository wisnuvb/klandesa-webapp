/**
 * `url_callback` dinamis: dibentuk dari host permintaan yang sedang berjalan (`X-Forwarded-Host`/`Host`
 * dan `X-Forwarded-Proto`), bukan dari env. Dengan begitu domain produksi, staging, maupun tunnel dev
 * otomatis benar. Reverse proxy wajib meneruskan header tersebut.
 */
export const LINKQU_CALLBACK_PATH = "/api/billing/linkqu/callback";

const HOST_PATTERN = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/i;
const LOCAL_HOST_PATTERN = /^([a-z0-9-]+\.)*localhost(:\d+)?$|^127\.0\.0\.1(:\d+)?$/i;

const firstValue = (value: string | null) => value?.split(",")[0]?.trim() || "";

/** Mengembalikan null bila host tidak valid. Skema selalu https kecuali host lokal. */
export function buildLinkquCallbackUrl(headers: Pick<Headers, "get">): string | null {
  const host =
    firstValue(headers.get("x-forwarded-host")) || firstValue(headers.get("host"));
  if (!host || !HOST_PATTERN.test(host)) return null;

  const isLocal = LOCAL_HOST_PATTERN.test(host);
  const forwardedProto = firstValue(headers.get("x-forwarded-proto")).toLowerCase();
  const proto = isLocal ? (forwardedProto === "https" ? "https" : "http") : "https";

  return `${proto}://${host}${LINKQU_CALLBACK_PATH}`;
}
