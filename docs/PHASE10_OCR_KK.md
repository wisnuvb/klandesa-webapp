# Paket 10: isi cepat dari foto KK (OCR di peramban) — PERCOBAAN

Tanggal: 2026-11-02. Status: **dikode dan teruji lokal (unit + uji peramban Chrome headless dengan KK sintetis); BELUM diuji dengan foto KK nyata; belum di-commit/deploy; tanpa skema/SQL.**
Keputusan pemilik: OCR yang tidak mengirim foto ke pihak ketiga (tanpa layanan AI luar). Fitur ditandai "percobaan" di UI.

## Cara kerja
Wizard "Tambah Keluarga" langkah 1 → kartu "Isi cepat dari foto KK" → dialog: ambil foto (kamera) / pilih berkas → putar bila perlu → "Baca KK" → ringkasan hasil (NIK penuh terlihat agar bisa dicocokkan dengan foto, tanda "periksa" per isian) → "Terapkan ke formulir". Hasilnya menjadi **draf** di wizard: validasi, pemeriksaan NIK, dan langkah Periksa tetap berlaku; kartu anggota memuat kotak "Dari foto KK, periksa:".

Alur teknis (`lib/kependudukan/kk-ocr/`):
1. `engine.ts` (klien saja): buka gambar (EXIF dihormati) → kanvas sisi panjang ≈3000 px → `image-ops.ts`: luruskan kemiringan (proyeksi baris), ratakan bayangan (bagi dengan latar lokal), regangkan kontras → tesseract.js (bahasa `ind`, mode satu blok) → baris-baris (`page.ts`, celah lebar = batas kolom).
2. `parse.ts` (murni): NIK 16 digit sebagai jangkar baris anggota (toleran O/0, I/1, S/5, B/8 dan spasi sisipan); jenis kelamin, tempat/tanggal lahir, agama, pendidikan, pekerjaan, golongan darah dari baris itu; status perkawinan, hubungan KK, kewarganegaraan, nama ayah/ibu dari tabel kedua (dipasangkan menurut nomor urut; tanpa nomor hanya bila jumlah baris sama). Kosakata dipetakan ke isian aplikasi lewat normalizer impor warga yang sudah ada.
3. Pemeriksaan silang: tanggal lahir/jenis kelamin dari NIK melengkapi yang kosong dan **menandai** (bukan menimpa) yang bertentangan; NIK bukan 16 digit/tidak sah/ganda; awalan nomor KK vs NIK mayoritas anggota; jumlah baris tabel tidak sama; kepala keluarga tak terbaca.
4. `apply.ts`: draf → `FamilyHeader`/`FamilyMemberInput` (+ catatan per anggota).

## Privasi
Foto dibaca di perangkat: mesin, data bahasa, dan worker dilayani dari `/ocr` (tidak ada permintaan ke CDN), tidak diunggah, tidak disimpan. Teks hasil baca baru dikirim ke server ketika operator menekan Lanjut/Simpan seperti isian biasa (sama seperti mengetik manual).

## Aset dan pemasangan
- `pnpm add -w tesseract.js` (v7). `public/ocr/`: `worker.min.js`, `tesseract-core-simd-lstm.wasm.js` dan `tesseract-core-lstm.wasm.js` (cadangan tanpa SIMD), `ind.traineddata` (tessdata_fast) — ±9 MB, diunduh peramban hanya saat fitur dipakai, lalu di-cache. Perbarui bersama versi paket (lihat `public/ocr/README.txt`).
- `middleware.ts`: matcher mengecualikan `ocr/` agar berkas statis tidak melewati middleware.
- Tidak ada CSP di aplikasi, jadi tidak ada penyesuaian header.

## Hasil ukur (HANYA KK sintetis; bukan jaminan untuk foto nyata)
Diuji dengan KK buatan 4 anggota (huruf Arial), di Node (`scripts/kk-ocr-eval.ts`) dan di Chrome headless (jalur peramban lengkap):
- KK bersih: 4/4 anggota, semua isian benar; ±1,6 dtk.
- "Foto ponsel" (3000 px, miring 2,2°, bayangan, noise, JPEG q70): 4/4 anggota, kemiringan terkoreksi 2,25°; ±2,4 dtk; nama ayah/ibu satu baris tercampur (tidak ditandai).
- Foto buruk (1500 px, miring 3°, blur, JPEG q45): hanya 2 dari 4 anggota terbaca → dialog memperingatkan resolusi rendah dan keyakinan rendah.
Sebelum luruskan/ratakan bayangan, foto ponsel sintetis yang sama hanya menghasilkan 2–3 anggota; langkah itu terbukti perlu.

## Mengukur dengan foto nyata (di komputer Anda; foto tidak keluar)
`node --import tsx scripts/kk-ocr-eval.ts <foto|folder> [--truth kebenaran.json] [--show-text]` — mencetak draf (NIK disamarkan) dan tanda periksa; dengan berkas kebenaran mencetak persentase benar per kolom. Format kebenaran ada di kepala skrip. Disarankan 10–20 KK nyata yang datanya boleh dipakai.

## Keterbatasan yang diketahui
- Foto tidak lurus ke atas (perspektif/lipatan), pantulan, dan resolusi rendah menurunkan mutu tajam. Belum ada koreksi perspektif.
- Pemisahan nama ayah/ibu bergantung pada celah kolom; nama panjang bisa tercampur. Nama dengan kata menempel ("SITIAMINAH") tidak dikoreksi.
- Tahap pra-pemrosesan berjalan di thread utama (±0,3–0,8 dtk, UI sempat berhenti sejenak); bisa dipindah ke Web Worker bila terasa.
- Hanya KK. KTP belum (latar bermotif/hologram jauh lebih sulit).
- Jika mutu pada foto nyata kurang: langkah berikutnya PaddleOCR sebagai layanan di VPS (masih tanpa pihak ketiga, tetapi menambah beban dan permukaan serangan server).

## Tes
`tests/kk-ocr-parse.test.ts` (15), `tests/kk-ocr-image-ops.test.ts` (6: kemiringan, bayangan, kontras), `tests/kk-ocr-apply.test.tsx` (6: pemetaan ke wizard dan kartu anggota). Uji peramban nyata dilakukan manual lewat halaman uji sementara (tidak disimpan di repo).
