/**
 * `url_callback` dinamis: dibentuk dari host permintaan yang sedang berjalan (`X-Forwarded-Host`/`Host`
 * dan `X-Forwarded-Proto`), bukan dari env. Dengan begitu domain produksi, staging, maupun tunnel dev
 * otomatis benar. Reverse proxy wajib meneruskan header tersebut.
 */
export const LINKQU_CALLBACK_PATH = "/api/billing/linkqu/callback";

const HOST_PATTERN = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/i;
const LOCAL_HOST_PATTERN = /^([a-z0-9-]+\.)*localhost(:\d+)?$|^127\.0\.0\.1(:\d+)?$/i;

const firstValue = (value: string | null) => value?.split(",")[0]?.trim() || "";

/**
 * Host callback yang BOLEH dipakai: `LINKQU_CALLBACK_HOSTS` (dipisah koma), atau host `APP_PUBLIC_URL`. Header Host/X-Forwarded-Host
 * dikendalikan pemanggil (admin desa bisa mengirim checkout dengan Host palsu lewat curl) sehingga callback LinkQu untuk tagihannya
 * bisa dibelokkan ke server lain. Bila ada daftar dan host permintaan tidak termasuk, dipakai host PERTAMA di daftar (pembayaran
 * tetap jalan). Tanpa konfigurasi apa pun perilaku lama dipertahankan (dan dicatat sekali di log).
 */
export function allowedCallbackHosts(env: NodeJS.ProcessEnv = process.env): string[] {
  const fromList = (env.LINKQU_CALLBACK_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter((h) => h && HOST_PATTERN.test(h));
  if (fromList.length > 0) return fromList;
  const app = env.APP_PUBLIC_URL?.trim();
  if (app) {
    try {
      return [new URL(app).host.toLowerCase()];
    } catch {
      // abaikan; dianggap tidak dikonfigurasi
    }
  }
  return [];
}

let warnedOpen = false;

/** Mengembalikan null bila host tidak valid. Skema selalu https kecuali host lokal. */
export function buildLinkquCallbackUrl(headers: Pick<Headers, "get">, env: NodeJS.ProcessEnv = process.env): string | null {
  let host =
    firstValue(headers.get("x-forwarded-host")) || firstValue(headers.get("host"));
  if (!host || !HOST_PATTERN.test(host)) return null;

  const allowed = allowedCallbackHosts(env);
  if (allowed.length > 0) {
    if (!allowed.includes(host.toLowerCase())) host = allowed[0]!;
  } else if (!warnedOpen && env.NODE_ENV === "production") {
    warnedOpen = true;
    console.warn("[linkqu] LINKQU_CALLBACK_HOSTS/APP_PUBLIC_URL belum diisi: url_callback diambil dari header Host permintaan.");
  }

  const isLocal = LOCAL_HOST_PATTERN.test(host);
  const forwardedProto = firstValue(headers.get("x-forwarded-proto")).toLowerCase();
  const proto = isLocal ? (forwardedProto === "https" ? "https" : "http") : "https";

  return `${proto}://${host}${LINKQU_CALLBACK_PATH}`;
}
