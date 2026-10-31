import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SIGNATURE_TOLERANCE_SECONDS = 300;

export const generateWebhookSecret = () => `whsec_${randomBytes(32).toString("base64url")}`;

/** Tanda tangan = HMAC-SHA256 atas `${timestamp}.${body}`; stempel waktu ikut ditandatangani agar rekaman lama tidak bisa diputar ulang. */
export function signWebhook(secret: string, timestamp: number, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export const signatureHeader = (secret: string, timestamp: number, body: string) => `t=${timestamp},v1=${signWebhook(secret, timestamp, body)}`;

/** Contoh sisi penerima (dipakai tes dan dokumentasi). */
export function verifyWebhook(secret: string, header: string, body: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  const m = /^t=(\d{1,12}),v1=([0-9a-f]{64})$/.exec(header);
  if (!m) return false;
  const t = Number(m[1]);
  if (Math.abs(nowSeconds - t) > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = Buffer.from(signWebhook(secret, t, body), "hex");
  const given = Buffer.from(m[2], "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}
