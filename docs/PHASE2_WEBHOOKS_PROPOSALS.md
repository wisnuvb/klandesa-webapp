# Fase 2: webhook keluar, usulan (maker-checker), periksa NIK

Status: kode + tes selesai 2026-11-01, belum di-commit/di-deploy. SQL produksi tertunda (rilis tunggal di akhir).

## 1. Webhook keluar

**Tujuan.** Aplikasi buatan desa tidak perlu memeriksa API berkala; Klandesa mengabari saat ada kejadian.

**Kejadian "tipis".** Isi kiriman hanya id (tanpa nama, NIK, alamat). Penerima mengambil detail lewat `/api/v1` dengan kunci miliknya, jadi scope dan penyamaran tetap berlaku. Katalog: `lib/webhooks/events.ts`
(`penduduk.dibuat`, `mutasi.diterapkan`, `pengumuman.terbit`, `data-kustom.baris.dibuat`, `data-kustom.baris.diubah`, `usulan.baru`).

**Bentuk kiriman.** `POST` JSON `{ id, type, createdAt, data }` + header `X-Klandesa-Event`, `X-Klandesa-Event-Id`, `X-Klandesa-Delivery`, `X-Klandesa-Signature: t=<detik>,v1=<hex>`.
Tanda tangan = HMAC-SHA256 atas `"<t>.<isi mentah>"` dengan rahasia `whsec_…` milik tujuan; penerima menolak bila `t` lebih dari 5 menit. Contoh verifikasi ada di layar dan di `lib/webhooks/sign.ts`.

**Keandalan.** Antrean keluar (outbox) di tabel `webhook_deliveries`. Percobaan pertama dikirim saat kejadian terjadi (di latar belakang, tidak pernah menggagalkan pekerjaan operator). Gagal → jeda 1m, 5m, 30m, 2j, 6j, 24j, lalu `DEAD` (tujuh percobaan). 4xx selain 408/425/429 langsung `DEAD`; 410 mematikan tujuan. 15 kegagalan berturut-turut mematikan tujuan otomatis. Pengiriman ganda dicegah dengan klaim bersyarat (`nextAttemptAt`). Urutan tidak dijamin; penerima memakai `id` untuk dedup.

**Anti-SSRF** (`lib/webhooks/url-guard.ts`): wajib https (http hanya di luar produksi), tanpa kredensial di alamat, host internal/IP privat/loopback/link-local/metadata/IPv6 terselubung ditolak; pemeriksaan diulang pada IP hasil DNS saat tersambung (`guardedLookup`), tanpa mengikuti redirect, batas waktu 8 detik, respons tidak disimpan.

**Hasil tinjauan keamanan (2026-11-01)** — tanpa celah Critical/High; diperbaiki: batas waktu TOTAL 10 detik + batas respons 64 KB, "Kirim uji" maks 5/menit/desa, IPv6 memakai daftar-izin `2000::/3`, URL di audit tanpa kueri, pemeriksaan ulang kelas data saat persetujuan usulan, nilai kolom yang kini pribadi disembunyikan dari daftar usulan, pembersihan usulan > 90 hari. **Diterima/catatan:** rahasia webhook disimpan teks biasa di DB (diperlukan untuk menghitung HMAC; enkripsi at-rest bisa menyusul); **jangan menyetel `NODE_USE_ENV_PROXY` di server produksi** (proxy akan melewati penjaga SSRF); kuota usulan tidak atomik (batas longgar, dilindungi rate limit); usulan dari kunci yang sudah dicabut tetap bisa diputuskan admin.

**Layar.** Sinkronisasi Data → Webhook (`/sinkronisasi-data/webhook`), hanya admin desa: tambah/ubah/matikan/hapus, "Kirim uji", ganti rahasia, riwayat pengiriman + kirim ulang. Rahasia tampil sekali. Maks 5 tujuan per desa.

**Job.** `POST /api/cron/webhook-deliver` tiap menit (`Authorization: Bearer $CRON_SECRET`) untuk kirim ulang; juga membuang riwayat > 14 hari.

## 2. Usulan perubahan (maker-checker, tangga kepercayaan 3)

Aplikasi luar tidak boleh menulis langsung. Kunci dengan scope `data-kustom:propose` hanya bisa **mengusulkan** menambah/mengubah baris data kustom; admin atau sekretaris desa menyetujui di `/data-kustom/usulan`.

- API: `POST /api/v1/data/{slug}/usulan` (202, status `PENDING`), `GET` untuk melihat status usulan milik kunci itu.
- Hanya kolom ber-kelas `NONE`. Kolom pribadi/sensitif ditolak. Tabel dengan kolom *wajib* pribadi tidak bisa menerima usulan baris baru.
- Persetujuan + perubahan data dalam **satu transaksi** lewat jalur operator yang sama (`createRecord`/`updateRecord`, validasi penuh). Gagal diterapkan (baris sudah dihapus, skema berubah) → semuanya dibatalkan, usulan tetap menunggu.
- Kedaluwarsa 30 hari; maks 30 usulan menunggu per kunci, 100 per desa. `note` dari pengusul = teks tak tepercaya, tampil sebagai teks biasa dengan label.
- **Aturan Dua:** kunci yang memegang scope sensitif (`kependudukan:read`) ditolak bila digabung dengan scope `:propose` (`scopeCombinationError`).
- Audit mencatat id/keputusan, bukan isi. Webhook `usulan.baru` memberi tahu admin.

## 3. Periksa NIK

`/data-warga/kualitas/nik` + `GET /api/kependudukan/kualitas/nik` (baca-saja). Memeriksa bentuk 16 angka, kode provinsi, tanggal di dalam NIK (perempuan +40), kecocokan dengan tanggal lahir dan jenis kelamin, serta kemungkinan warga ganda (nama + tanggal lahir + jenis kelamin sama, NIK berbeda). Hanya warga aktif; hanya 4 digit terakhir NIK dikirim. Temuan = "perlu dicek", bukan "salah". **Belum ada:** penggabungan (merge) data ganda, status verifikasi per kolom, batch impor tercatat, ekspor penuh tenant.

## Migrasi produksi

`docs/PHASE2_WEBHOOKS_MIGRATION.sql`, `docs/PHASE2_PROPOSALS_MIGRATION.sql` (hanya `CREATE TABLE`/`ADD CONSTRAINT`; rollback: `*_ROLLBACK.sql`). Terapkan lewat SQL manual setelah backup, bukan `prisma db push` dari skema lama.
