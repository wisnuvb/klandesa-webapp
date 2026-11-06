import { renderEmail, type EmailContent } from "@/lib/email/render";

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(d) + " WIB";

export function platformInviteEmail(o: { name: string; invitedBy: string; link: string; expiresAt: Date }): EmailContent {
  return renderEmail({
    subject: "Undangan admin platform Klandesa",
    title: `Halo ${o.name}, Anda diundang menjadi admin platform`,
    paragraphs: [
      `${o.invitedBy} mengundang Anda mengelola platform Klandesa (akses lintas desa).`,
      `Klik tombol di bawah untuk membuat kata sandi Anda, lalu aktifkan verifikasi dua langkah (2FA) di menu Keamanan. Tautan berlaku sampai ${fmtDate(o.expiresAt)} dan hanya bisa dipakai satu kali.`,
    ],
    cta: { label: "Buat kata sandi", url: o.link },
    note: "Jika Anda tidak mengenali undangan ini, abaikan email ini; tidak ada yang terjadi tanpa tindakan Anda.",
  });
}

export function platformResetEmail(o: { name: string; byEmail: string; link: string; expiresAt: Date }): EmailContent {
  return renderEmail({
    subject: "Atur ulang kata sandi admin platform Klandesa",
    title: `Halo ${o.name}, atur ulang kata sandi Anda`,
    paragraphs: [
      `${o.byEmail} meminta atur ulang kata sandi akun admin platform Anda. Kata sandi lama tetap berlaku sampai Anda membuat yang baru.`,
      `Klik tombol di bawah untuk membuat kata sandi baru. Tautan berlaku sampai ${fmtDate(o.expiresAt)} dan hanya bisa dipakai satu kali. Verifikasi dua langkah (bila aktif) tidak berubah.`,
    ],
    cta: { label: "Buat kata sandi baru", url: o.link },
    note: "Jika Anda tidak mengenali permintaan ini, jangan klik tautan dan hubungi admin lain.",
  });
}

/** Pemberitahuan keamanan setelah kata sandi admin platform berubah (tanpa tautan: admin platform tidak punya "lupa sandi" publik). */
export function platformPasswordChangedEmail(o: { name: string; at: Date }): EmailContent {
  return renderEmail({
    subject: "Kata sandi admin platform Klandesa diganti",
    title: `Halo ${o.name}, kata sandi Anda baru saja diganti`,
    paragraphs: [
      `Kata sandi akun admin platform Klandesa Anda diganti pada ${fmtDate(o.at)}. Semua sesi sebelumnya telah dikeluarkan.`,
      "Jika ini memang Anda, tidak ada yang perlu dilakukan.",
    ],
    note: "Jika bukan Anda, segera minta admin platform lain mengirim tautan atur ulang sandi dan mereset 2FA akun Anda.",
  });
}
