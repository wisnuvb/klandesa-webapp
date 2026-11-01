# Fase 1 butir 8 (lanjutan): KIA ibu hamil dan posyandu lansia

Status: dikode 2026-11-01; belum diuji di browser; SQL produksi belum diterapkan (`PHASE1_KIA_MIGRATION.sql`, tiga tabel baru, rollback tersedia). Layar `/pkk/ibu-hamil` dan `/pkk/lansia` (tautan dari halaman PKK), memakai izin resource `pkk`. Data kesehatan: akses dicek langganan aktif, audit hanya memuat id catatan.

## KIA (ibu hamil)
Mendaftarkan kehamilan (HPHT; HPL = HPHT + 280 hari), mencatat kunjungan antenatal (berat, tekanan darah, LiLA, tinggi fundus, denyut jantung janin, Hb, TT, tablet tambah darah, USG, tanda bahaya), mengakhiri kehamilan (bersalin/keguguran). Papan menaruh yang berpenanda dan yang tertinggal di atas.
- **Kunjungan dianjurkan minimal 6 kali: 2 di trimester 1 (0-12 minggu), 1 di trimester 2 (13-24), 3 di trimester 3 (25+), dua oleh dokter (trimester 1 dan 3) termasuk USG.** Ini dikutip luas dari Permenkes 21/2021 dan pedoman ANC Kemenkes; **pembagian trimester berbeda antar sumber, dan satu agregator peraturan mencatat Permenkes 21/2021 berstatus "tidak berlaku"**. Cek ke JDIH Kemenkes bila dipakai sebagai dasar hukum.
- Tanda bahaya: enam tanda Buku KIA (perdarahan, muntah terus, demam tinggi, bengkak/sakit kepala/kejang, gerakan janin berkurang, ketuban pecah dini).
- Penanda "perlu ditinjau bidan": tekanan darah >= 140/90, LiLA < 23,5 cm, Hb < 11 g/dL, denyut jantung janin di luar 120-160, umur < 20 atau > 35 tahun. Angka baku klinis, bukan diagnosis.
- Aturan data: hanya warga perempuan, hidup, umur 10-55 tahun pada HPHT; satu kehamilan terbuka per warga (dijaga indeks unik, teruji serentak); HPHT tidak di masa depan dan tidak lebih dari 43 minggu; kunjungan tidak sebelum HPHT dan tidak pada kehamilan yang sudah berakhir; catatan yang sudah punya kunjungan tidak bisa dihapus.

## Posyandu lansia
Warga usia 60 tahun ke atas (UU 13/1998). Mencatat berat, tinggi, tekanan darah, gula darah (puasa/sewaktu), dan skor kemandirian 0-20. Papan menandai belum pernah diperiksa, perlu diperiksa lagi (pengingat aplikasi 90 hari, **bukan ketentuan**), dan penanda: tekanan darah >= 140/90, gula darah puasa >= 126 atau sewaktu >= 200 mg/dL.
- **Kategori IMT dan kategori kemandirian (Barthel) sengaja tidak ditanam.** Pencarian menemukan batas yang berbeda antar sumber sekunder (IMT: batas Permenkes 41/2014 berbeda dengan batas Asia-Pasifik; Barthel: versi 20 poin dan 100 poin dengan label berbeda) dan tidak menemukan teks Kemenkes yang menyatakan satu pun. Nilai dicatat mentah; IMT hanya dihitung angkanya.
- **SKILAS (Kemenkes 2022) belum dibuat**: daftar lengkap domain skriningnya tidak ditemukan di sumber publik. Perlu Pedoman SKILAS atau bantuan puskesmas.

## Belum dikerjakan
Persalinan dan nifas rinci, kohort ibu/anak, rujukan, KB; Kartu Menuju Sehat lansia; SKILAS; integrasi ASIK/Sehatku; layar hapus kehamilan (hanya lewat API).
