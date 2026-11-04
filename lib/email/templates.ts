import { renderEmail, type EmailContent } from "./render";

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(d) + " WIB";

/** Undangan akun baru: tautan sekali pakai untuk membuat kata sandi sendiri. */
export function inviteEmail(o: { name: string; villageName: string; invitedBy?: string | null; link: string; expiresAt: Date }): EmailContent {
  return renderEmail({
    subject: `Undangan akun Klandesa — ${o.villageName}`,
    title: `Halo ${o.name}, akun Klandesa Anda siap`,
    paragraphs: [
      `${o.invitedBy ? `${o.invitedBy} dari ` : ""}${o.villageName} telah membuatkan akun Klandesa untuk Anda.`,
      `Klik tombol di bawah untuk membuat kata sandi Anda sendiri, lalu masuk dengan email ini. Tautan berlaku sampai ${fmtDate(o.expiresAt)} dan hanya bisa dipakai satu kali.`,
    ],
    cta: { label: "Buat kata sandi", url: o.link },
    note: "Jika Anda tidak merasa menjadi bagian dari desa ini, abaikan email ini; tidak ada yang terjadi pada akun tanpa tindakan Anda.",
  });
}

/** Atur ulang kata sandi (lupa sandi atau diminta admin). */
export function resetEmail(o: { name: string; link: string; expiresAt: Date; byAdmin: boolean }): EmailContent {
  return renderEmail({
    subject: "Atur ulang kata sandi Klandesa",
    title: `Halo ${o.name}, atur ulang kata sandi Anda`,
    paragraphs: [
      o.byAdmin
        ? "Admin desa Anda meminta atur ulang kata sandi untuk akun ini. Kata sandi lama sudah tidak berlaku."
        : "Kami menerima permintaan untuk mengatur ulang kata sandi akun Klandesa Anda.",
      `Klik tombol di bawah untuk membuat kata sandi baru. Tautan berlaku sampai ${fmtDate(o.expiresAt)} dan hanya bisa dipakai satu kali.`,
    ],
    cta: { label: "Buat kata sandi baru", url: o.link },
    note: o.byAdmin
      ? "Jika Anda tidak mengenali permintaan ini, hubungi admin desa Anda."
      : "Jika bukan Anda yang meminta, abaikan email ini; kata sandi Anda tetap seperti semula.",
  });
}

/** Pemberitahuan keamanan setelah kata sandi diganti. */
export function passwordChangedEmail(o: { name: string; at: Date; loginUrl: string }): EmailContent {
  return renderEmail({
    subject: "Kata sandi akun Klandesa Anda diganti",
    title: `Halo ${o.name}, kata sandi Anda baru saja diganti`,
    paragraphs: [
      `Kata sandi akun Klandesa Anda diganti pada ${fmtDate(o.at)}. Semua sesi sebelumnya (web dan aplikasi seluler) telah dikeluarkan.`,
      "Jika ini memang Anda, tidak ada yang perlu dilakukan.",
    ],
    cta: { label: "Amankan akun saya (atur ulang kata sandi)", url: o.loginUrl },
    note: "Jika bukan Anda, segera atur ulang kata sandi lewat tombol di atas dan beri tahu admin desa Anda.",
  });
}

/** Sambutan untuk desa yang baru mendaftar (satu kali). */
export function welcomeEmail(o: { name: string; villageName: string; trialDays: number; loginUrl: string; onboardingUrl: string }): EmailContent {
  return renderEmail({
    subject: `Selamat datang di Klandesa — ${o.villageName}`,
    title: `Selamat datang, ${o.name}`,
    paragraphs: [
      `Desa ${o.villageName} sudah terdaftar di Klandesa. Masa percobaan Anda berlaku ${o.trialDays} hari dengan fitur lengkap.`,
      "Langkah awal yang disarankan: lengkapi profil desa dan kop surat, isi data perangkat desa, lalu impor data warga. Dari menu Akses Pengguna Anda bisa mengundang perangkat desa dengan peran masing-masing.",
    ],
    cta: { label: "Masuk dan mulai", url: o.onboardingUrl },
    note: "Email ini dikirim sekali karena ada pendaftaran dengan alamat ini. Jika bukan Anda yang mendaftar, abaikan saja.",
  });
}
