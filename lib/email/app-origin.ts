import { getMainSiteOrigin } from "@/lib/seo/url";

/**
 * Origin aplikasi (dasbor) untuk tautan di email: `APP_PUBLIC_URL`, atau `my.<domain utama>`.
 * SENGAJA dari konfigurasi, BUKAN dari header Host permintaan: header Host bisa dipalsukan sehingga email
 * "atur ulang kata sandi" untuk korban berisi tautan ke situs penyerang (password-reset poisoning).
 */
export function getAppOrigin(): string {
  const explicit = process.env.APP_PUBLIC_URL?.trim();
  if (explicit) {
    try {
      return new URL(explicit).origin;
    } catch {
      // jatuh ke turunan di bawah
    }
  }
  const main = new URL(getMainSiteOrigin());
  const host = main.hostname;
  if (host.includes("localhost") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return main.origin;
  return `${main.protocol}//my.${host.replace(/^www\./, "")}${main.port ? `:${main.port}` : ""}`;
}
