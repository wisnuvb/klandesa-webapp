# Uji manual Website Desa

Daftar uji berurutan untuk semua fitur Website Desa yang baru. Urutannya disengaja: tiap bagian memakai hasil bagian sebelumnya. Unit test sudah menutup logika (`npm run test:unit`); daftar ini untuk hal yang hanya terlihat di browser.

Tandai `[x]` bila lolos. Bila ada yang gagal, catat langkah, apa yang terlihat, dan apa yang diharapkan.

## 0. Persiapan (sekali saja)

- [ ] Jalankan migrasi: `npx prisma migrate deploy` (memuat `website_daily_stats` dan `website_theme_packs`), lalu `npx prisma generate`.
- [ ] Restart server dev / PM2 supaya Prisma client baru terpakai.
- [ ] Siapkan **dua akun**: admin desa (punya langganan website aktif) dan akun platform (untuk bagian 8).
- [ ] Siapkan satu desa uji dengan **subdomain** (mis. `desauji.localhost:2042`) dan buka situsnya di tab terpisah.
- [ ] (Bagian 7) Isi `OPENROUTER_API_KEY`. Untuk hasil yang layak set juga `WEBSITE_AI_MODEL` ke model berbayar; model gratis bawaan sering gagal membalas JSON.
- [ ] (Data lama) Dry-run backfill domain: `npx tsx scripts/backfill-website-domains.ts`. Periksa daftarnya, baru jalankan dengan `--apply`.

## 1. Alur langganan dan masa aktif

Halaman: `/website`

- [ ] Desa tanpa langganan: kartu template tampil, tombol aksi berbunyi untuk **membeli** baru.
- [ ] Isi subdomain: ketersediaan diperiksa saat mengetik (tersedia / sudah dipakai / tidak valid). Subdomain yang sudah dipakai desa lain ditolak sebelum bayar.
- [ ] Setelah aktif: situs publik terbuka di subdomain, dan banner **penyiapan cepat** muncul di `/website`.
- [ ] Langganan yang tinggal ≤30 hari: statusnya "segera berakhir". Tombol memakai kata **perpanjang** pada template yang sama, **ganti** pada template lain.
- [ ] Perpanjang template yang sama: tanggal kedaluwarsa **menyambung** dari tanggal lama (bukan dari hari ini) dan **kustomisasi tidak hilang**.
- [ ] Ganti ke template lain: kustomisasi direset (ini disengaja).
- [ ] Langganan kedaluwarsa (ubah `expiryDate` di DB ke kemarin): situs publik menampilkan "Website sedang tidak aktif", `/website` menampilkan banner kedaluwarsa, CMS tidak bisa menerbitkan.
- [ ] Kartu statistik kunjungan tampil (hari ini / 7 hari / 30 hari). Buka beranda situs publik beberapa kali dari browser biasa; angkanya naik. Refresh cepat berulang oleh pengunjung yang sama tidak boleh menambah berlebihan.

## 2. Penyiapan cepat (wizard)

Halaman: `/website/setup` (tiga langkah: **Tampilan**, **Isi beranda**, **Terbitkan**)

- [ ] **Tampilan**: pilih warna; warna yang terlalu terang diberi peringatan atau otomatis digelapkan sampai terbaca. Pilih gaya huruf, termasuk "Bawaan template".
- [ ] Unggah/pilih logo dari arsip digital. Kalau logo tersedia, warna dominan ditawarkan sebagai usulan.
- [ ] **Isi beranda**: judul sambutan, subjudul, foto utama (dari arsip digital), angka desa. Angka usulan (penduduk, KK, dst.) berasal dari data desa; baris yang kosong tidak ikut tampil di situs.
- [ ] **Terbitkan**: "Simpan sebagai draf dulu" → situs publik **belum berubah**. Tombol terbit → situs publik berubah.
- [ ] Logo tampil di header situs publik pada ketiga template (modern, klasik, bawaan).
- [ ] Setelah wizard selesai, banner penyiapan di `/website` hilang.
- [ ] Layar HP (lebar ~375px): tombol minimal 44px, tidak ada scroll horizontal.

## 3. Draf dan terbit

Halaman: `/website/cms`

- [ ] Ubah judul beranda, tekan **Simpan draf**. Bilah publikasi menampilkan lencana **Draf** dan tulisan bahwa pengunjung masih melihat versi sebelumnya.
- [ ] Muat ulang situs publik: **tidak berubah**. Muat ulang CMS: perubahan draf masih ada.
- [ ] Tombol **Lihat website** membuka situs publik; pratinjau di CMS menunjukkan versi draf.
- [ ] **Terbitkan**: situs publik berubah, lencana Draf hilang.
- [ ] Buat perubahan lagi, lalu **Riwayat → Pulihkan sebagai draf**: draf berisi versi lama, situs publik tetap. Terbitkan untuk mengembalikan.
- [ ] **Buang draf** meminta konfirmasi; setelah dikonfirmasi draf hilang dan CMS kembali ke versi tayang.
- [ ] Terapkan preset / template tersimpan / impor template: hasilnya masuk **draf**, situs publik tidak berubah sebelum terbit.
- [ ] Riwayat maksimal 10 versi; yang terlama tergeser.
- [ ] Buka CMS di dua tab, simpan di keduanya: tidak ada error, dan versi terakhir yang disimpan yang menang (catat perilaku bila aneh).

## 4. Blok berdaftar (list items)

Di CMS, bagian beranda → blok **Fitur**, **Angka**, **Galeri**, **FAQ**, **Testimoni**:

- [ ] Tambah, hapus, dan ubah urutan item. Batas: fitur 12, angka 6, galeri 24, FAQ 20, testimoni 12. Melewati batas ditolak dengan pesan jelas.
- [ ] Simpan, muat ulang: urutan dan isi sama. Terbitkan: situs publik sama dengan pratinjau.
- [ ] Item kosong tidak merusak tampilan.
- [ ] Galeri: URL gambar `http://` atau tanpa skema **tidak membuat halaman error** (hanya tidak ditampilkan). Caption dipakai sebagai teks alternatif.
- [ ] Situs yang dibuat **sebelum** fitur ini (slot tetap lama) tetap tampil benar, dan saat dibuka di CMS item lama muncul sebagai daftar.
- [ ] Variabel `{{village.name}}` di dalam item terisi dengan benar di situs publik.

## 5. Varian blok

- [ ] Tiap blok punya pemilih varian dengan gambar wireframe. Mengganti varian langsung terlihat di pratinjau.
- [ ] Varian yang tidak diizinkan template tidak muncul sebagai pilihan.
- [ ] Ganti ke template lain: varian yang tidak diizinkan di template baru otomatis jatuh ke varian pertama yang diizinkan, tanpa error.
- [ ] Layar HP: tiap varian terbaca, tidak ada teks terpotong atau meluber.

## 6. Tema dan keterbacaan

- [ ] Ubah warna utama ke warna sangat terang (mis. kuning pucat): kartu Tema menampilkan **peringatan kontras**. Teks utama di situs publik tetap terbaca.
- [ ] Ubah gaya huruf dan kelengkungan: pratinjau langsung berubah; setelah terbit, situs publik sama.
- [ ] Mode gelap peramban: situs publik tidak rusak.

## 7. Minta AI

Kartu **Minta AI memperbaiki tampilan** di CMS. Butuh saldo kredit (5 kredit per permintaan).

- [ ] Ada perubahan yang belum disimpan → tombol terkunci dengan penjelasan. Simpan dulu → tombol aktif.
- [ ] Klik salah satu contoh permintaan; teksnya masuk ke kotak. Permintaan <5 atau >600 karakter ditolak.
- [ ] **Buat usulan**: tombol berubah "AI sedang bekerja…", lalu dialog menampilkan ringkasan, daftar perubahan berbahasa biasa, usulan yang dilewati beserta alasan, dan pratinjau.
- [ ] **Coba permintaan lain** kembali ke kotak permintaan tanpa menerapkan apa pun.
- [ ] **Terapkan ke draf**: CMS memuat ulang, lencana Draf muncul, situs publik **tidak berubah**. Hasil draf sama dengan pratinjau.
- [ ] Saldo kredit berkurang 5 setelah usulan berhasil.
- [ ] **Kredit kembali** bila gagal: kosongkan/ubah `OPENROUTER_API_KEY` jadi salah, kirim permintaan → pesan error dan saldo tidak berkurang.
- [ ] Saldo kredit <5: permintaan ditolak dengan pesan yang jelas.
- [ ] Permintaan yang tidak masuk akal ("hapus semua halaman", "tambahkan script"): AI tidak boleh menghapus halaman/menu atau memasukkan kode; usulan dilewati atau ditolak sebagai "tidak ada perubahan".
- [ ] Beberapa permintaan berbeda ("lebih hijau", "tambahkan FAQ", "fokus berita", "rapikan urutan"): catat berapa yang menghasilkan usulan berguna. Bila sering gagal, coba model lain lewat `WEBSITE_AI_MODEL` sebelum menyimpulkan fiturnya bermasalah.
- [ ] Akun staf non-admin desa: kartu tidak bisa dipakai / API menolak.

## 8. Paket tema (developer)

Belum ada layar antarmuka; dilakukan lewat API dengan sesi akun platform. Contoh manifes ada di `lib/website-engine/examples/desa-hijau.theme-pack.json`.

- [ ] `POST /api/admin/theme-packs` dengan isi manifes contoh → status `pending`.
- [ ] Kirim lagi manifes yang rusak (`basePack` tidak dikenal, warna bukan hex, kunci `default` atau kunci paket inti): ditolak dengan daftar `errors` yang spesifik.
- [ ] `GET /api/admin/theme-packs` menampilkan paket tersebut.
- [ ] `POST /api/admin/theme-packs/{id}/review` dengan `{"action":"approve","price":...}` → muncul template baru di katalog `/website` dan bisa dibeli seperti template biasa.
- [ ] Beli/pakai template itu di desa uji: tema (warna, huruf, radius) dan varian yang diizinkan sesuai manifes.
- [ ] Kirim versi lebih tinggi dengan `key` yang sama → setelah approve, template yang sama diperbarui (bukan duplikat). Versi yang sama atau lebih rendah ditolak.
- [ ] `reject` dan `withdraw` mengubah status dan tidak membuat template.

## 9. Keamanan dan isolasi (cepat)

- [ ] Tanpa login, `POST /api/website/ai/suggest`, `/api/website/engine/publish`, `/api/admin/theme-packs` → **401**.
- [ ] Admin desa A tidak bisa melihat/mengubah draf desa B (ganti sesi, coba endpoint yang sama).
- [ ] Dua desa dengan subdomain berbeda tampil dengan isi dan tema masing-masing (tidak tertukar).

## 10. Setelah semua lolos

- [ ] Beri tahu admin desa bahwa tombol **Simpan** sekarang menyimpan ke **draf**, dan perlu menekan **Terbitkan**.
- [ ] Pisahkan commit dari perubahan modul surat/billing/absensi yang masih berjalan di working tree.
