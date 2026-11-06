/** Helper fetch klien untuk halaman Keamanan/Audit. Melempar Error(pesan Indonesia dari server) agar dialog bisa menampilkannya. */
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiJson<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init?.method ?? "GET",
      cache: "no-store",
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError("Tidak dapat terhubung ke server. Periksa koneksi Anda.", 0);
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; code?: string };
  if (!res.ok) {
    const fallback = res.status === 401 ? "Sesi Anda berakhir. Silakan masuk kembali." : res.status === 403 ? "Anda tidak berhak melakukan aksi ini." : "Permintaan gagal. Coba lagi.";
    throw new ApiError(typeof data.error === "string" && data.error ? data.error : fallback, res.status, data.code);
  }
  return data;
}

const wibFull = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Jakarta" });
const wibShort = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

/** Waktu WIB terbaca. */
export const formatWib = (iso: string | null | undefined, withSeconds = false): string =>
  iso ? `${(withSeconds ? wibFull : wibShort).format(new Date(iso))} WIB` : "-";

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
