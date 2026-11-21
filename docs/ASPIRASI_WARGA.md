# Aspirasi Warga publik (Paket 15)

Permintaan pemilik 2026-11-21. Iklan membawa pendaftar yang bukan perangkat desa: warga yang ingin melaporkan kondisi desanya (sampah, jalan, dan sebagainya). Dua keputusan:

1. **Formulir kontak bertanya peran lebih dulu.** Hanya perangkat desa yang menjadi lead penjualan. Warga diarahkan ke formulir aspirasi.
2. **Aspirasi warga tampil publik di klandesa.com**, identitas pelapor dijaga, bisa diindeks mesin pencari, dan desa yang bersangkutan dapat mendaftar, **mengklaim** halaman wilayahnya, lalu menanggapi atau berbanding lewat dasbor.

## Fase dan status

| Fase | Isi | Status |
| --- | --- | --- |
| A | Peran + jabatan di 3 formulir kontak, filter di `/admin/kontak`, email lead memuat peran | Selesai |
| B | Formulir aspirasi `/aspirasi/kirim`, antrean moderasi, foto bersih metadata | Selesai |
| C | Halaman publik (`/aspirasi`, `/aspirasi/desa/[slug]`, `/aspirasi/laporan/[slug]`), laporkan konten, takedown | Selesai (noindex) |
| D | Klaim desa, dasbor desa `/aspirasi-publik` (tanggapan, progres, sanggahan/banding, keberatan) | Selesai |
| E | Pagar pengindeksan: sitemap, JSON-LD, canonical, masa tenggang | Selesai, **MATI** sampai `ASPIRASI_INDEXING=on` |

## Alur

```
Warga  → /aspirasi/kirim → (Turnstile, batas laju) → PENDING
Admin  → /admin/aspirasi → Tayangkan | Tolak (alasan) | Sunting | Hapus
Publik → /aspirasi/laporan/<judul>-<kode>   (tanpa nama/kontak pelapor)
Desa   → daftar akun → /aspirasi-publik → Klaim wilayah → admin verifikasi bukti → APPROVED
Desa   → tanggapi (RESPONSE | PROGRESS | RESOLVED | DISPUTE=banding) → tampil publik di bawah laporan
Siapa pun → "Laporkan konten" → admin tinjau; PERSONAL_DATA dapat menyembunyikan otomatis
```

## Keputusan desain (dan alasannya)

- **Selalu moderasi dulu.** Tidak ada jalur laporan langsung tayang. Risiko hukum (pencemaran nama baik, UU ITE) dan data pribadi lebih mahal daripada antrean.
- **Identitas pelapor tidak pernah ikut kueri publik.** Semua baca publik lewat `PUBLIC_SELECT` (lib/aspirasi/service.ts). Tes integrasi memeriksa keluaran JSON publik tidak memuat nama, telepon, email, atau `ipHash`. Jangan menambah kolom `reporter*`, `ipHash`, `moderation*` ke select itu.
- **IP tidak disimpan mentah**: `ipHash = sha256(ip + rahasia)` hanya untuk batas laju dan deteksi penyalahgunaan.
- **Data pribadi di isi**: NIK/nomor KK (16 angka) **ditolak**; nomor telepon, email, dan tautan **disamarkan** otomatis. Moderator tetap meninjau nama orang, wajah, dan plat nomor secara manual.
- **Foto**: hanya WebP ≤ 1,5 MB, maksimal 3. Peramban mengecilkan dan membuang EXIF lewat kanvas; server memeriksa ulang potongan RIFF dan menolak EXIF/XMP/ICCP/animasi. Foto tidak tayang sebelum moderasi.
- **Wilayah diverifikasi ke sumber** (wilayah.id) dari kodenya, jadi halaman desa tidak bisa dibuat dengan nama palsu. Bila sumber tidak terjangkau/desa tidak ada, pelapor boleh mengetik manual; admin melihat tanda "wilayah diketik manual".
- **Klaim desa manual.** Siapa pun bisa mengaku perangkat desa; admin menyetujui berdasarkan bukti (tautan situs resmi desa, nomor SK) dan petunjuk kecocokan nama (0–3). Satu wilayah satu desa, satu desa satu wilayah. Persetujuan menolak otomatis klaim saingan; pencabutan dimungkinkan.
- **Banding = sanggahan.** Desa tidak dapat menghapus laporan. Ia dapat menanggapi, memberi kabar progres, menandai selesai, atau menyanggah (tampil publik berdampingan dengan laporan), dan mengajukan keberatan ke admin (data pribadi menyembunyikan laporan sementara).
- **Flag otomatis menyembunyikan** hanya untuk alasan `PERSONAL_DATA`: dari desa pengelola (1 laporan) atau dari publik (≥ 3 pelapor berbeda; IPv6 dihitung per /64). Keberatan desa wajib dijelaskan (≥ 20 karakter) dan dibatasi 5 per hari per desa. Satu orang usil tidak bisa membungkam laporan; kerugian data pribadi tidak menunggu.
- **Netral, bukan menghakimi.** Halaman memakai istilah "aspirasi warga" dan status tindak lanjut, dengan catatan "dikirim warga dan belum tentu diverifikasi Klandesa". Bukan lembaga pengaduan resmi; tautan ke LAPOR! tersedia.

## Pagar pengindeksan (Fase E)

Semua halaman aspirasi **noindex dan keluar dari sitemap** sampai pemilik menyalakan `ASPIRASI_INDEXING=on` di lingkungan server (lalu restart). Setelah menyala, satu laporan layak indeks bila: tayang, tidak ditandai noindex, tidak punya laporan konten terbuka, **sudah lewat 7 hari sejak tayang** (memberi desa kesempatan menanggapi/berkeberatan), dan isinya ≥ 200 karakter. Halaman desa diindeks bila punya ≥ 2 laporan layak indeks. Logika: `lib/aspirasi/seo.ts` (dites).

Kapan menyalakan? Sarankan setelah: (1) beberapa minggu moderasi berjalan tanpa insiden, (2) teks kebijakan privasi/syarat layanan bagian Aspirasi ditinjau pemilik/hukum, (3) minimal ~10 laporan tayang berkualitas, (4) uji tombol Laporkan dan takedown sampai tuntas.

## Model data (tabel baru)

`aspiration_areas` (desa/kelurahan, `villageId` unik setelah klaim), `aspirations`, `aspiration_replies`, `aspiration_flags`, `village_claims`; kolom baru `contacts.role`, `contacts.position`. Penjelasan kolom ada di komentar `prisma/schema.prisma`.

## Rute

- Publik: `POST /api/aspirasi`, `POST /api/aspirasi/photos`, `POST /api/aspirasi/status`, `POST /api/aspirasi/[code]/flag`, `GET /api/aspirasi/wilayah`, `GET /api/aspirasi/areas`. Semua berbatas laju; kirim dan laporkan memakai Turnstile. Tercatat di allowlist `tests/api-guard-coverage.test.ts`.
- Desa (`requireVillageApiContext`, izin `citizen_reports`): `GET/POST /api/aspirasi-publik…` (daftar, klaim, tanggapan, hapus tanggapan, keberatan).
- Admin platform (`requirePlatformSession`, tercatat di jejak audit): `/api/admin/aspirasi…` (moderasi, laporan konten, klaim).

## SOP moderasi singkat

Antrean: terlama dulu; usahakan ditinjau dalam beberapa hari kerja (jangan menjanjikan angka di UI).

- **Tayangkan** bila: merujuk kondisi nyata di wilayah, bernada faktual, tanpa data pribadi.
- **Sunting** (bukan tolak) bila hanya sebagian bermasalah: hapus nama orang/nomor/alamat rumah; buang foto yang menampilkan wajah atau plat nomor yang jelas.
- **Tolak** (tulis alasan; pelapor membacanya lewat Cek Status) bila: menyerang pribadi/golongan, iklan/spam, memuat data pribadi yang tak bisa disunting, bukan soal desa, atau tak dapat dipahami.
- **Sembunyikan** (bukan hapus) bila ragu atau menunggu keterangan; **Hapus** (takedown, final) bila terbukti melanggar atau atas permintaan sah.
- Wilayah **diketik manual**: periksa ejaan dan kecocokan dengan daftar resmi sebelum menayangkan, agar tidak membuat halaman desa ganda.
- **Klaim desa**: setujui bila situs/SK/nomor resmi cocok dengan desa dan jabatan masuk akal; email akun berdomain `.desa.id` atau tautan situs resmi menguatkan. Tolak/cabut dengan alasan tertulis.
- **Laporan konten**: `PERSONAL_DATA` diprioritaskan (sudah dapat menyembunyikan otomatis). Tindak lanjuti = ambil tindakan atas laporan (sembunyikan/sunting/hapus) lalu tutup; Tolak = laporan konten tak berdasar.
- Permintaan penghapusan dari orang yang disebut dalam laporan: sembunyikan dulu, tinjau, lalu hapus bila sah.

## Deploy

1. **SQL dulu** di produksi: `docs/PHASE15_ASPIRASI_WARGA_MIGRATION.sql` (aditif; kolom `contacts.role/position` + 5 tabel). Salinan di `prisma/migrations/20261121090000_aspirasi_warga/`. Lalu `prisma generate` (lihat prosedur rilis berdampingan). Diverifikasi di MySQL scratch: ROLLBACK lalu MIGRATION menghasilkan skema identik (`prisma migrate diff` kosong).
2. Env: `SPACES_*` harus terisi agar unggah foto bekerja (tanpa itu unggah foto mengembalikan 503, formulir tetap bisa mengirim tanpa foto). `TURNSTILE_*` untuk kirim/laporkan di produksi. `ASPIRASI_INDEXING` **jangan diisi** dulu.
3. Pastikan tabel `mobile_rate_limits` ada (dipakai batas laju bersama; sudah ada di produksi).
4. Setelah deploy, uji tangan: kirim 1 aspirasi dari ponsel → tinjau di `/admin/aspirasi` → tayangkan → buka halaman publik → ajukan klaim dari akun desa uji → setujui → tanggapi → laporkan konten → takedown.

Rollback: `PHASE15_ASPIRASI_WARGA_ROLLBACK.sql` (menghapus semua data aspirasi; kode lama tidak memakai tabelnya, tetapi kueri Contact memilih kolom `role/position`, jadi jalankan rollback SQL hanya setelah kode lama kembali).

## Tinjauan keamanan (2026-11-21)

Tinjauan independen atas kode: tidak ada celah Kritis/Tinggi; kebocoran data pelapor, XSS, SSRF, IDOR, dan open redirect tidak ditemukan. Sembilan temuan Sedang/Rendah diperbaiki: batas cek status per kode laporan (kode tampil publik, jadi dulu bisa dipakai menebak kontak pelapor); batas laju IPv6 per /64; keberatan desa wajib alasan + dibatasi; alamat laporan ikut judul baru saat disunting; foto dihapus dari Spaces saat takedown/dibuang moderator (CDN dapat menyimpan salinan sampai cache habis); ukuran RIFF WebP harus pas; batas per kontak menghitung laporan yang tersimpan (bukan percobaan); rute dasbor desa menolak permintaan lintas situs; halaman desa 404 bila tanpa laporan tayang dan belum diklaim; draf formulir tidak menyimpan kontak.

Sisa yang disengaja: unggah foto tanpa Turnstile (hanya batas laju per perangkat; foto yatim belum dibersihkan terjadwal); foto yang tidak dilampirkan ke laporan tetap ada di Spaces.

## Belum / keputusan pemilik

- **Siapa memoderasi** dan berapa lama target tinjauan. Saat ini hanya admin platform; email pemilik dikirim untuk setiap aspirasi baru (maks 30/jam).
- **Teks hukum** (kebijakan privasi, syarat layanan) bagian Aspirasi adalah **draf** yang perlu ditinjau pemilik/penasihat hukum sebelum pengindeksan dinyalakan. Usulan retensi kontak pelapor: simpan sampai 12 bulan setelah laporan ditinjau (belum ada pekerjaan penghapusan terjadwal).
- **Verifikasi kontak pelapor** (OTP WhatsApp/email) belum ada; pertahanan saat ini: Turnstile, batas laju (5/hari/perangkat, 3/hari/kontak), kolom jebakan bot, moderasi.
- **Tidak ada notifikasi ke pelapor** saat laporan tayang/ditolak (mereka memakai Cek Status). Bisa ditambah bila kontak email tersedia.
- **Desa belum klaim tidak diberi tahu** ada laporan di wilayahnya. Pintu masuknya: kotak "Apakah Anda perangkat desa ini?" di halaman laporan dan halaman desa.
- Foto tidak diburamkan otomatis (wajah/plat); moderator yang memeriksa.
- Belum diuji di peramban dengan Spaces/Turnstile produksi.
