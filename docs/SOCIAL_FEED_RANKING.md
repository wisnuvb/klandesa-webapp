# Warga: feed "Untuk Anda" (Fase 0–2)

Keputusan 2026-10-29: feed Warga tidak lagi urut waktu murni. Ada tab **Untuk Anda** (dipilihkan menurut minat) di samping
**Terbaru** (urut waktu). Ini membalik keputusan "tanpa algoritma" di `MOBILE_V2_PRODUCT_SPEC.md` §14.2 (sudah diperbarui).
Alasan dan pagar di bawah. Kode: `lib/mobile/social-ranking.ts` (murni), `social-interest.ts` (DB), `social-metrics.ts`.

## Fase 0: pencatatan sinyal
- Aplikasi mengirim paket kejadian ke `POST /social/signals`: postingan **tampil** (≥ 1 detik, dihitung bila ≥ 60% terlihat), **dibuka**, **dibagikan**, **dikurangi**.
- Server sendiri mencatat **suka, simpan, komentar, laporan** dari route yang sudah ada (`learnFromPost`).
- Tabel: `social_post_signals` (satu baris per akun×postingan, di-upsert, bukan log mentah) dan `social_interests` (profil minat).
- Bobot (`EVENT_WEIGHT`): suka 1, buka 1,5, komentar 3, bagikan 3, simpan 4, tertahan ≥ 3 dtk 0,5, kurangi −5, laporkan −10.
- Yang dipelajari hanya: **penulis, kategori, jenis (foto/video/tulisan), RT, #tag**. Tidak ada tebakan agama, politik, atau sentimen.
- Minat **meluruh separuh tiap 14 hari**. Profil dibatasi 150 baris. Perangkat desa tidak diprofil.
- Warga bisa menolak dipelajari atau mengatur ulang di **Warga → Atur minat saya** (`/social/interests`). Menolak = profil minat **dan seluruh jejak per postingan dihapus**, lalu tidak ada pencatatan sama sekali (postingan yang pernah dikurangi ikut tampil lagi).

## Fase 1: pemeringkatan
`skor = kesegaran × (1 + 2,0 × kedekatan + 0,4 × keramaian) × penalti sudah-dilihat`
- Kesegaran separuh tiap 36 jam. Tanpa minat, urutannya **sama dengan urut waktu**.
- Keramaian dari suka + 2 × **penulis komentar berbeda** (adu argumen dua orang tidak dianggap viral), jenuh pada ±20.
- Hanya postingan 72 jam terakhir yang diperingkat (dilebarkan ke 14 hari bila < 30 postingan); sisanya menyusul urut waktu.
- Cursor memuat waktu acuan sehingga halaman 2, 3, … konsisten dengan halaman 1.

**Pagar anti-gelembung** (semua diuji di `tests/social-ranking.test.ts`):
1. Kabar resmi desa selalu di atas, tidak dipersonalisasi.
2. **1 dari 5 slot adalah penjelajahan**: postingan terbaru yang netral dari penulis lain, berlabel "Kabar baru dari warga lain".
3. Penulis yang sama maksimal 2 berturut-turut di seluruh feed (termasuk ekor urut waktu), selama masih ada penulis lain untuk diselipkan.
4. Postingan baru dijamin muncul di halaman pertama lewat slot penjelajahan.
5. Postingan dilaporkan tidak pernah didorong (minat dan keramaian diabaikan). Yang disembunyikan warga tidak tampil di "Untuk Anda" miliknya.
6. Postingan sendiri yang baru dibuat disematkan 3 jam (agar tidak terasa hilang).
7. **Terbaru selalu ada**, dan pencarian serta "Disimpan" selalu urut waktu.
8. Transparan: label alasan ("Anda sering berinteraksi dengan …"), menu "Kenapa saya melihat ini?", "Kurangi yang seperti ini".

**Kapan aktif** (`Village.settings.mobile.social.feed`, diatur di Pengaturan Warga):
`auto` (bawaan): tab muncul bila desa ≥ 40 postingan/7 hari · `on`: selalu · `off`: hanya Terbaru (mis. menjelang pilkades).
Hanya warga; perangkat desa selalu urut waktu agar bisa memoderasi semuanya. **Desa sepi tidak melihat perubahan apa pun**: itu disengaja, karena di bawah ambang personalisasi tidak menambah apa-apa dan hanya berisiko menyembunyikan postingan tetangga.

## Fase 2: pengukuran dan penyetelan
`GET /staff/social/metrics?days=14` (tampil di Pengaturan Warga). 10% akun (deterministik) **tidak diberi tab "Untuk Anda"** sebagai pembanding (`holdoutPercent`).
Dibaca per kelompok: warga yang membaca, tampil per pembaca, **rasio buka**, reaksi dan bagikan per pembaca, rasio "kurangi"; serta pemerataan:
postingan yang sudah direspons, **postingan yang belum dibaca siapa pun**, dan **porsi 3 penulis teratas**.

| Tanda | Arti | Yang disetel di `RANKING` |
|---|---|---|
| Belum dibaca siapa pun > 20% | Jangkauan tak merata | naikkan `exploreEvery` frekuensi (turunkan angkanya), perlebar `windowHours` |
| 3 penulis > 60% bacaan | Gelembung | turunkan `affinityWeight`, perketat `maxConsecutiveAuthor` |
| Rasio laporan > 2% | Moderasi tertinggal | jangan tambah jangkauan; tinjau moderasi |
| Rasio buka "Untuk Anda" ≈ pembanding | Personalisasi tak menolong | tetap `auto`; naikkan `forYouMinWeeklyPosts` atau matikan |
| Rasio "kurangi" tinggi | Pilihan meleset | turunkan `affinityWeight`, perpendek `interestHalfLifeDays` |

Aturan setel: ubah **satu angka**, jalankan tes, amati 2 minggu. Angka di desa kecil berisik; baru dipercaya bila tiap kelompok ≥ 10 pembaca.
Catatan: penghitung di baris sinyal bersifat kumulatif per akun×postingan; baris dipilih menurut `lastSeenAt` dalam periode.

## Yang belum dikerjakan
- **Syarat komunitas:** layar syarat kini memuat pengungkapan singkat soal "Untuk Anda" (draf faktual, bukan bahasa hukum). Perlu **dicek konsultan hukum (UU PDP, pembuatan profil)** sebelum rilis. Warga yang sudah menyetujui syarat sebelumnya tidak diminta setuju ulang; mereka mendapat penjelasan di layar Atur minat saya.
- Bobot dan ambang di `RANKING` adalah titik awal beralasan, **bukan hasil pengukuran**. Penyetelan sesungguhnya menunggu data desa pilot.
- Migrasi `20261029160000_social_feed_signals` sudah diterapkan ke DB lokal; untuk server lain jalankan `prisma migrate deploy` (hanya bila riwayat migrasi server itu utuh).
- Sudah diuji ujung-ke-ujung ke DB lokal (35 pemeriksaan: peringkat, belajar, kurangi, tolak dipelajari, atur ulang, metrik). Belum diuji di HP.
