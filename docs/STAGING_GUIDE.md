# Panduan staging dan uji lapangan (Mobile v2)

Tujuan: membuktikan di lingkungan nyata apa yang selama ini baru lulus typecheck dan tes unit. Sampai panduan ini dijalankan,
**belum ada fitur Mobile v2 yang teruji terhadap database, LinkQu, atau perangkat sungguhan.**

Perintah di bawah adalah contoh; sesuaikan dengan server Anda dan jangan jalankan di database produksi sebelum dicoba di staging.

## 1. Siapkan staging
- Salin database produksi ke database staging yang terpisah (atau buat baru dengan data contoh). **Jangan** menunjuk staging ke database produksi.
- Variabel lingkungan yang harus terisi di staging:

| Variabel | Fungsi | Catatan |
|---|---|---|
| `DATABASE_URL` | database staging | terpisah dari produksi |
| `AUTH_SECRET` (dan `NEXTAUTH_SECRET`) | menandatangani sesi web dan token mobile | acak panjang, **berbeda** dari produksi. Tanpa ini server sengaja menolak jalan. |
| `CRON_SECRET` | otorisasi job harian | acak panjang |
| `SPACES_ACCESS_KEY_ID`, `SPACES_SECRET_ACCESS_KEY`, `SPACES_ENDPOINT`, `SPACES_BUCKET`, `SPACES_REGION`, `SPACES_CDN_BASE_URL` | unggah foto (laporan, bukti iuran, QRIS) | gunakan bucket staging |
| `EXPO_ACCESS_TOKEN` | kirim push notification | boleh kosong bila belum menguji push |
| `LINKQU_*` | pembayaran paket (mode sandbox) | lihat dokumentasi LinkQu yang Anda pakai |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` | email pengingat perpanjangan (Brevo) | pengirim harus alamat/domain yang sudah diverifikasi di Brevo; `BREVO_SENDER_NAME` opsional (default "Klandesa") |

## 2. Terapkan migrasi (urut)
Migrasi mobile yang belum pernah diterapkan di produksi, urut nama:
1. `20261022100000_mobile_sessions_devices`
2. `20261022110000_citizen_accounts`
3. `20261022120000_mobile_mail_notifications`
4. `20261022130000_mobile_citizen_reports`
5. `20261022140000_mobile_social`
6. `20261022150000_mobile_rate_limits`
7. `20261024100000_mobile_data_changes`
8. `20261024110000_mobile_rt_scope`
9. `20261024120000_add_comment_likes`
10. `20261024130000_social_post_embed_link`
11. `20261029100000_mobile_fees_cash` (4 tabel iuran dan kas)
12. `20261029140000_trial_villages_to_lengkap` (memindahkan desa **trial/grace** dari "profesional" ke "lengkap"; desa berbayar tidak disentuh)

```bash
pnpm prisma migrate status      # lihat mana yang belum diterapkan
pnpm prisma migrate deploy      # terapkan (di staging dulu)
```
Setelah itu cek: tabel `fee_schedules`, `fee_charges`, `fee_payments`, `cash_entries`, `mobile_sessions` ada; jalankan
`SELECT subscriptionPlan, subscriptionStatus, COUNT(*) FROM villages GROUP BY 1,2;` dan pastikan hanya desa trial/grace yang berubah.

**Sebelum produksi:** cadangkan database dulu, dan baca isi migrasi 12 karena ia mengubah data (bukan hanya skema).

## 3. Server dan jaringan
- **Job harian iuran**: panggil `POST /api/cron/fees` dengan header `Authorization: Bearer $CRON_SECRET` sekali sehari (mis. 01:00 WIB).
  ```cron
  0 18 * * *  curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://STAGING/api/cron/fees
  ```
  (18:00 UTC = 01:00 WIB.) Tanpa ini tagihan hanya dibuat saat jadwal dibuat atau dibuka, dan pengingat tidak terkirim.
- **Job harian pengingat perpanjangan**: panggil `POST /api/cron/subscription-reminders` dengan header yang sama, sekali sehari (mis. 02:00 WIB). Mengirim email via Brevo ke admin/kepala desa dan membuat notifikasi di lonceng aplikasi. Pengingat langganan hanya untuk desa Paket Lengkap (desa paket lama tidak ditagih bulanan, jadi tidak diingatkan); pengingat arsip untuk semua desa. Jadwal: trial (7, 3, 1 hari sebelum berakhir, dan saat berakhir), langganan berbayar (30, 7, 1 hari, dan saat berakhir), add-on arsip (7, 1 hari, dan saat berakhir). Aman dijalankan berulang (satu pengingat tidak dikirim dua kali). Mengembalikan 503 bila `CRON_SECRET` atau Brevo belum dikonfigurasi.
  ```cron
  0 19 * * *  curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://STAGING/api/cron/subscription-reminders
  ```
- **Job harian batas simpan notifikasi**: panggil `POST /api/cron/notification-retention` dengan header yang sama, sekali sehari (mis. 03:00 WIB). Menghapus permanen notifikasi lonceng web (`admin_notifications`, status bacanya ikut terhapus) yang lebih tua dari 90 hari, serta notifikasi mobile (`user_notifications`) yang lebih tua dari 90 hari atau sudah dibaca dan lebih tua dari 30 hari. Notifikasi lebih tua dari 30 hari sudah tidak ditampilkan/dibuat lagi. Angkanya ada di `lib/notifications/retention-policy.ts`. Dihapus per batch 1.000 baris (maks 20 batch per panggilan), aman dijalankan berulang.
  ```cron
  0 20 * * *  curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://STAGING/api/cron/notification-retention
  ```
- **Nginx**: teruskan IP asli (`X-Real-IP` / `X-Forwarded-For`) supaya pembatas laju per IP tidak menghitung semua orang sebagai satu IP;
  naikkan `client_max_body_size` agar unggahan foto tidak ditolak (foto diunggah langsung ke Spaces, tetapi tetap longgarkan batasnya).
- Pastikan `https://STAGING/api/mobile/v1/config` terbuka dari HP (tanpa login) dan mengembalikan JSON.

## 4. Bangun aplikasi untuk uji
Di folder `mobile/`:
```bash
EXPO_PUBLIC_API_URL=https://STAGING pnpm exec expo start       # uji cepat di Expo Go
eas build --profile preview --platform android                  # APK uji untuk dibagikan ke perangkat
```
Build produksi memakai `com.klandesa.klan_desa` dan keystore dari freelancer; **build preview tidak boleh diunggah ke Play Store.**

## 5. Data uji: Karanganyar
1. Buat/aktifkan desa Karanganyar (Kec. Yosowilangun, Kab. Lumajang) di staging dan impor data warga (minimal 20 KK dengan nomor KK terisi).
2. Buat akun perangkat desa (peran punya izin `finance` dan `mail`), dan 2 akun warga (satu kepala keluarga).
3. Tugaskan seorang warga sebagai **Ketua RT** lewat menu penugasan RT.

## 6. Daftar uji (centang satu per satu, catat hasilnya)

### A. Login dan dasar
- [ ] Warga mendaftar dan masuk; keluar dan masuk lagi; token menyegarkan sendiri setelah 15+ menit.
- [ ] Perangkat desa masuk; peran tanpa izin tidak melihat menu yang bukan haknya.
- [ ] Mode pesawat: layar memuat data tersimpan, aksi yang butuh sinyal memberi pesan jelas.

### B. Surat dan RT
- [ ] Warga mengajukan surat → muncul "menunggu RT" di aplikasi warga **dan** di web (Permohonan Warga, lencana "Menunggu RT x").
- [ ] Ketua RT lain (RT berbeda) **tidak** melihat permohonan itu.
- [ ] Ketua RT menyetujui → perangkat desa mendapat notifikasi dan bisa memproses.
- [ ] Ketua RT menolak dengan alasan → warga membaca alasannya.
- [ ] Surat jadi bisa diunduh, kode QR bisa dipindai dan halaman `/verifikasi-surat/<token>` menampilkan keabsahan.
- [ ] Di tabel `audit_logs` ada baris `rt_approve`/`rt_reject` dengan `metadata.actor` berisi nama dan RT petugas.

### C. Iuran dan kas
- [ ] Ketua RT membuat jadwal bulanan → tagihan per KK muncul, kepala KK menerima notifikasi.
- [ ] Warga menekan "Saya sudah bayar" (dengan dan tanpa foto) → Ketua RT melihat laporan, menekan "Uang sudah diterima".
- [ ] Dua laporan bayar untuk tagihan yang sama: konfirmasi kedua yang melebihi nominal ditolak.
- [ ] Catat bayar langsung (tunai, cicilan), bebaskan tagihan dengan alasan, batalkan pembebasan.
- [ ] Buku kas: tambah pemasukan dan pengeluaran dengan foto nota; batalkan entri dengan alasan (tidak ikut saldo, tetap tercatat).
- [ ] Ekspor CSV terbuka di spreadsheet dan sel berawalan `=`, `+`, `-`, `@` tampil sebagai teks.
- [ ] Panggil job harian secara manual (`curl` di atas): tidak membuat tagihan ganda; pengingat hanya untuk tagihan lewat 3 hari.
- [ ] Warga hanya melihat tagihan KK-nya sendiri; Kas RT di sisi warga hanya menampilkan total, tanpa nama pembayar.
- [ ] Web: tab **Iuran & Kas** di menu Kegiatan RT/RW menampilkan angka yang sama dengan aplikasi.
- [ ] Tabel `audit_logs` memuat `create_fee_schedule`, `record_fee_payment`, `confirm_fee_payment`, `void_cash_entry`, dst.

### D. Paket Lengkap dan pembayaran
- [ ] Desa baru: pembelian Rp3.500.000 lewat LinkQu sandbox → callback masuk → langganan aktif 12 bulan, modul Kegiatan RT/RW terbuka.
- [ ] Perpanjangan Rp100.000 × 1/3/6/12 bulan memperpanjang dari tanggal berakhir yang ada (bukan dari hari ini).
- [ ] Desa lama berstatus aktif: tampilan paket dan fitur **tidak berubah**.
- [ ] Callback LinkQu dikirim dua kali: langganan tidak bertambah dua kali.

### E. Keamanan singkat
- [ ] Token milik desa A tidak bisa membuka data desa B (coba ganti id di URL API).
- [ ] 10+ percobaan login salah → dibatasi (rate limit) dan pesan error seragam.
- [ ] `POST /api/cron/fees` tanpa header / dengan secret salah → 401; `CRON_SECRET` kosong → 503.
- [ ] Hapus akun warga: data pribadi hilang, sesi dicabut.

### F. Pemantauan
- [ ] Sengaja picu error di layar (build preview): layar "Ada yang tidak berjalan" muncul dan log server memuat baris `mobile_crash` (cari di log PM2).
- [ ] Dashboard kabupaten (login regional) → Adopsi digital → kartu "Pemakaian aplikasi warga" menampilkan desa uji sebagai Aktif setelah warga masuk.

## 7. Setelah lulus
Catat temuan dan perbaiki sebelum onboarding desa sungguhan. Jangan menerapkan ke produksi sebelum bagian A–D lulus di staging.
Hal yang masih di luar panduan ini: keystore dan upload key Play Store, Sentry/Crashlytics (bila ingin lebih dari log server), ikon final.

### G. Paket Lengkap dan batasnya (baru)
- [ ] Daftar desa baru: status trial berpaket `lengkap`; semua modul terbuka; kartu Tagihan tidak menampilkan modul sebagai add-on.
- [ ] Desa trial membeli Paket Lengkap: ditagih **Rp3.500.000** (bukan Rp100.000). Setelah lunas, perpanjang 1 bulan ditagih **Rp100.000**.
- [ ] Migrasi `20261029140000_trial_villages_to_lengkap` sudah diterapkan: desa trial/grace lama berpaket `lengkap`, desa berbayar tidak berubah.
- [ ] Add-on arsip: beli 20 GB → kuota naik; di halaman Arsip muncul "aktif hingga"; perpanjang menyambung sisa waktu; kapasitas lebih kecil saat add-on aktif ditolak; setelah `expiryDate` lewat kuota kembali 5 GB, file tetap ada, unggahan baru terblokir bila melebihi.
- [ ] Absensi: desa Paket Lengkap dengan 11+ perangkat aktif, perangkat ke-11 absen lewat web **dan** HP → ditolak dengan pesan kapasitas; desa Starter lama tidak terpengaruh.
- [ ] Kuota foto seluler 5 GB: sementara turunkan `MOBILE_MEDIA_QUOTA_BYTES` di staging, unggah foto → ditolak dengan pesan "Penyimpanan foto desa sedang penuh".
- [ ] Komisi mitra: hubungkan desa ke mitra → entri CLOSING = 10% x harga Paket Lengkap (Rp350.000 pada Rp3,5 jt); bayar Paket Lengkap lewat desa itu → entri SUBSCRIPTION = 10% invoice. Di admin/mitra kolom "Bonus closing (% harga paket)" menampilkan perkiraan nominal; kosongkan untuk memakai nominal tetap.
- [ ] Penghitung foto (`village_media_usage`): unggah foto → `mobileBytes` bertambah; hapus postingan Warga yang berfoto → berkurang. Pada unggahan pertama desa yang sudah punya foto, baris terisi dari isi bucket (sekali saja). Jalankan `npx tsx scripts/reconcile-mobile-media.ts <kodeDesa>` untuk mencocokkan ulang dengan bucket.
- [ ] Kredit AI: kirim pertanyaan → saldo berkurang 1; saldo 0 → ditolak (402); panggilan AI gagal → saldo dikembalikan; beli paket kredit → saldo bertambah sesuai paket.
- [ ] `POST /api/cron/notification-retention` tanpa header → 401; dengan secret benar → `{ ok, adminDeleted, mobileDeleted }`; dijalankan dua kali → panggilan kedua menghapus 0.
- [ ] Lonceng desa: klik notifikasi atau "Tandai semua dibaca" → badge hilang dan tetap hilang setelah muat ulang halaman (untuk semua peran, termasuk staf, dan saat trial/grace).
- [ ] `POST /api/cron/subscription-reminders` tanpa header → 401; email uji terkirim ke admin desa; dijalankan dua kali → tidak ada email ganda.
