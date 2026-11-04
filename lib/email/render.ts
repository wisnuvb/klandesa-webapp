/** Kerangka email transaksional: HTML + teks polos dari satu sumber. Semua teks dinamis di-escape. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

export function renderEmail(opts: {
  subject: string;
  title: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  /** Catatan kecil di bawah (mis. "abaikan bila bukan Anda"). */
  note?: string;
}): EmailContent {
  const { subject, title, paragraphs, cta, note } = opts;
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;max-width:560px">` +
    `<h2 style="font-size:18px;margin:0 0 12px">${escapeHtml(title)}</h2>` +
    paragraphs.map((p) => `<p style="margin:0 0 12px">${escapeHtml(p)}</p>`).join("") +
    (cta
      ? `<p style="margin:20px 0"><a href="${escapeHtml(cta.url)}" style="background:#0d9488;color:#ffffff;padding:11px 20px;border-radius:8px;text-decoration:none;display:inline-block">${escapeHtml(cta.label)}</a></p>` +
        `<p style="margin:0 0 12px;color:#6b7280;font-size:13px;word-break:break-all">Jika tombol tidak berfungsi, salin tautan ini ke peramban:<br>${escapeHtml(cta.url)}</p>`
      : "") +
    (note ? `<p style="margin:12px 0 0;color:#6b7280;font-size:13px">${escapeHtml(note)}</p>` : "") +
    `<p style="margin:16px 0 0;color:#6b7280;font-size:13px">Tim Klandesa</p></div>`;
  const text =
    `${title}\n\n${paragraphs.join("\n\n")}` +
    (cta ? `\n\n${cta.label}: ${cta.url}` : "") +
    (note ? `\n\n${note}` : "") +
    `\n\n— Tim Klandesa`;
  return { subject, html, text };
}
