# Email transaksional (Brevo)

Satu lapisan untuk semua email: [`lib/email/`](../lib/email/). Env: `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `EMAIL_DAILY_LIMIT` (bawaan 250), `APP_PUBLIC_URL` (opsional). Brevo mensyaratkan IP server terdaftar di *Authorised IPs* (IPv4 **dan** IPv6).

## Prinsip

1. **Email tidak pernah membawa kata sandi.** Akun baru/atur ulang = **tautan sekali pakai** (`/auth/atur-sandi?token=…`), hanya hash sha256 token yang disimpan (`auth_tokens`), berlaku 72 jam (undangan) / 24 jam (diminta admin) / 1 jam (lupa sandi sendiri), dan menerbitkan token baru mencabut yang lama. Mengklik tautan sekaligus **membuktikan email itu milik orangnya**.
2. **Tautan dibuat dari konfigurasi, bukan header `Host`** (`getAppOrigin()`), agar tidak bisa diracuni (password-reset poisoning).
3. **Hemat kuota** (`sendTransactional`): anggaran harian dari tabel `email_logs` (lintas worker PM2); email biasa berhenti di `EMAIL_DAILY_LIMIT`, email kritis (undangan, atur ulang) punya cadangan +40; dedup template+penerima dalam jendela waktu; alamat di log hanya hash.
4. **Tidak ada email yang "hilang":** bila Brevo belum dikonfigurasi/kuota habis/gagal, undangan & atur ulang oleh admin mengembalikan **tautan manual** (tampil sekali) untuk disampaikan admin lewat jalur pribadi.
5. **Jawaban publik seragam** (`/api/auth/lupa-sandi`): terdaftar atau tidak, jawabannya sama; Turnstile + batas 3/jam per email + 10/jam per IP + satu penerbitan per 2 menit per akun.
6. **Anti-penyalahgunaan** (hasil tinjauan keamanan independen): IP klien dari `X-Real-IP` / entri TERAKHIR XFF (`lib/rbac/client-ip.ts`; entri pertama bisa dipalsukan); lookup + kirim "lupa sandi" berjalan di latar sehingga waktu respons tidak membocorkan akun terdaftar; batas per-email tidak pernah memberi sinyal (selalu jawaban sama) dan permintaan publik **tidak mencabut tautan lama** (orang lain tak bisa mematikan tautan korban); tindakan admin dibatasi 20/jam per desa dan hanya boleh memakai separuh cadangan kritis (sisanya untuk alur publik); email sambutan dibatasi 3/jam per IP dan hanya untuk email berformat valid; akun warga tidak bisa di-reset admin; **Google Analytics tidak dimuat di `/auth/atur-sandi`** (GA mengirim URL lengkap beserta token ke Google).
7. Dev lokal tanpa kunci Brevo: isi email (termasuk tautan) dicetak di terminal `npm run dev`.

## Daftar email saat ini

| Email | Pemicu | Penerima | Prioritas | Volume |
|---|---|---|---|---|
| Undangan akun | Admin membuat akun dari perangkat / kirim ulang | Pemilik akun | kritis | 1 per akun |
| Atur ulang kata sandi | "Lupa kata sandi" / admin kirim tautan | Pemilik akun | kritis | ≤3/jam/email |
| Kata sandi diganti | Ganti sandi di Profil / lewat tautan atur ulang | Pemilik akun | biasa | 1 per pergantian |
| Sambutan | Desa baru mendaftar | Email pendaftar | biasa | 1 per pendaftaran |
| Pengingat langganan | Cron harian (bucket 1/3/7/30 hari, dedup per desa) | Admin desa | biasa | terbatas per desa |
| Pengingat kepatuhan | Cron | Admin desa | biasa | terbatas |
| Pesanan website | Tagihan Website Desa Kustom lunas (sekali per tagihan) | Pemilik platform (`WEBSITE_ORDER_NOTIFY_EMAIL`) | biasa | per pesanan |

## Celah yang masih ada (diketahui)

- Token ada di query URL (tercatat di log nginx/riwayat peramban). Dibatasi oleh sekali-pakai + kedaluwarsa + GA dikecualikan; alternatif: fragment `#token=`.

## Kandidat berikutnya (belum dibuat)

- **Bukti pembayaran** setelah LinkQu menandai lunas: 1 email/transaksi, bernilai tinggi (bukti sah), volume kecil.

## Ditunda atas keputusan pemilik (2026-11-04)

- **Keputusan pengajuan mitra** (diterima/ditolak): fitur mitra belum dioptimalkan.
- **Ringkasan mingguan untuk admin desa** (digest permohonan/pengaduan tertunda): tidak perlu dulu. Bila nanti dibuat: satu email per desa per minggu, ada opt-out, dilewati bila kosong.
- **Akun nonaktif/peran diubah**: tidak disarankan (nilai rendah, memakan kuota); cukup tercatat di audit log.

## Yang SENGAJA tidak dikirim lewat email

Notifikasi per kejadian ke perangkat (surat masuk, pengaduan, pendaftaran warga) sudah lewat push seluler + lonceng dalam aplikasi. Mengemail tiap kejadian akan menghabiskan kuota 300/hari dengan cepat dan menyerupai spam.
