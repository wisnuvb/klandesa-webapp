/**
 * Pengiriman email transaksional lewat Brevo (https://developers.brevo.com/reference/sendtransacemail).
 * Env: BREVO_API_KEY, BREVO_SENDER_EMAIL (harus alamat/domain yang sudah diverifikasi di Brevo), BREVO_SENDER_NAME (opsional).
 */
const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const TIMEOUT_MS = 10_000;

export function isBrevoConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY?.trim() && process.env.BREVO_SENDER_EMAIL?.trim());
}

export type BrevoSendResult = { ok: true } | { ok: false; error: string };

export async function sendBrevoEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<BrevoSendResult> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  if (!apiKey || !senderEmail) return { ok: false, error: "Brevo belum dikonfigurasi" };

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: process.env.BREVO_SENDER_NAME?.trim() || "Klandesa", email: senderEmail },
        to: [{ email: input.to }],
        subject: input.subject,
        htmlContent: input.html,
        textContent: input.text,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return { ok: true };
    const detail = (await res.json().catch(() => null)) as { message?: string } | null;
    // Jangan sertakan header/kunci API dalam pesan galat.
    return { ok: false, error: `Brevo ${res.status}${detail?.message ? `: ${detail.message}` : ""}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal menghubungi Brevo" };
  }
}
