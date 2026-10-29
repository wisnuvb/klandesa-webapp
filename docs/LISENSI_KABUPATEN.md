# Lisensi dan Kemitraan Kabupaten — Analisis Harga dan Bentuk Kontrak

> Draf 2026-10-29 untuk dibahas dengan pemilik produk. **Semua angka adalah titik awal negosiasi yang dihitung dari harga desa saat ini, bukan data pasar atau biaya Klandesa yang sebenarnya.** Jumlah desa (Lumajang dan Kutai Kartanegara masing-masing kira-kira 200 desa/kelurahan) berasal dari ingatan, verifikasi ke BPS/Kemendagri. Aturan pengadaan dan penggunaan Dana Desa berubah-ubah: **periksa dengan bagian hukum/pengadaan kabupaten dan konsultan hukum sebelum menandatangani apa pun.**

## 1. Titik awal
- Desa membayar Rp3,5 jt (tahun 1) lalu Rp1,2 jt/tahun. Untuk ~200 desa: ±Rp700 jt tahun pertama, ±Rp240 jt/tahun berikutnya, **dibayar oleh desa sendiri**.
- Kabupaten sudah mendapat nilai nyata tanpa membayar: dashboard akuntabilitas (`/wilayah/akuntabilitas`) memakai data agregat, tanpa data pribadi.
- Hambatan terbesar bukan harga, melainkan **adopsi per desa** (8 jam onboarding per desa, dan kades yang harus memutuskan sendiri; desa memiliki otonomi, kabupaten tidak bisa memerintah).
- OpenSID gratis dan sudah dipakai banyak desa; kabupaten bisa saja sudah punya program sistem informasi desa. Perlu dicek sebelum pitch.

## 2. Tiga bentuk kerja sama
| | A. Kemitraan non-finansial | B. Lisensi dashboard kabupaten (berbayar) | C. Kabupaten membiayai desa |
|---|---|---|---|
| Siapa membayar | Desa (Rp3,5 jt/Rp1,2 jt) | Desa + kabupaten membayar lisensi dashboard | Kabupaten (APBD) membayar sebagian/seluruh biaya desa |
| Isi untuk kabupaten | Dashboard dasar, laporan adopsi | Dashboard lanjutan, laporan bulanan, pelatihan pelatih (ToT), dukungan prioritas | Semua A + B |
| Komitmen kabupaten | Surat edaran/rekomendasi, ruang dan jadwal pelatihan per kecamatan | Kontrak berbayar | Anggaran dan pengadaan |
| Kecepatan | Cepat (tanpa pengadaan) | Sedang | Lambat (proses anggaran/pengadaan) |
| Risiko | Kabupaten kurang berkomitmen | Nilai kontrak kecil terhadap upaya | Ketergantungan pada siklus anggaran; sensitif hukum pengadaan |

## 3. Rekomendasi: bertahap
1. **Tahap 0 — Pilot (0–3 bulan):** gratis untuk kabupaten, 5–10 desa (Karanganyar sebagai desa pertama di Lumajang). Tertulis dalam nota kesepahaman singkat: tujuan, indikator, jangka waktu, perlindungan data. Indikator pilot: aktivasi warga, median waktu surat, % pengaduan ditanggapi ≤ 3 hari, jam onboarding per desa.
2. **Tahap 1 — Kemitraan (A):** bila indikator tercapai, perjanjian kerja sama non-finansial: kabupaten menerbitkan surat edaran/rekomendasi, kecamatan menjadi tuan rumah pelatihan massal (mengurangi jam onboarding per desa dari 8 menjadi kira-kira 4, perkiraan yang perlu dibuktikan di pilot), Klandesa menyediakan dashboard.
3. **Tahap 2 — Lisensi lanjutan (B):** setelah kabupaten merasakan nilainya, tawarkan paket berbayar.

**Usulan harga B (untuk dinegosiasikan):**
```
Lisensi tahunan = biaya dasar + (jumlah desa aktif × tarif per desa)
contoh awal: Rp36.000.000 + (Rp120.000 × desa aktif); 200 desa aktif ≈ Rp60 jt/tahun
```
Dasar angka: dibuat agar tetap kecil dibanding pendapatan dari desa (±Rp240 jt/tahun di 200 desa) sehingga mudah disetujui, namun menutup beban khusus kabupaten (laporan, pelatihan pelatih, dukungan prioritas). **Hitung ulang dengan biaya dukungan Klandesa sesungguhnya** sebelum menawarkan. Hal yang boleh dijual di B: laporan akuntabilitas bulanan siap cetak, ekspor data agregat, pelatihan pelatih, SLA dukungan.

**Pembiayaan oleh kabupaten (C):** jangan dikejar lebih dulu. Bila kabupaten menawarkan, pastikan: nilai kontrak dan metode pengadaan ditentukan oleh bagian pengadaan kabupaten; **jangan memecah paket untuk menghindari tender** (dilarang); desa tetap yang memutuskan memakai atau tidak.

## 4. Unsur kontrak (A dan B)
- **Para pihak dan dasar hukum:** kabupaten (Dinas PMD/Diskominfo), Klandesa, dan (bila perlu) kecamatan. Desa menandatangani perjanjian layanan sendiri (otonomi desa).
- **Ruang lingkup dan tingkat layanan (SLA):** ketersediaan, jam dukungan, waktu respons, jadwal pemeliharaan.
- **Data:** data warga milik desa; kabupaten hanya melihat **agregat**, tanpa data pribadi (sudah demikian di dashboard; akses wilayah tercatat di `RegionalAccessLog`). Perjanjian pemrosesan data sesuai UU PDP: desa pengendali data, Klandesa pemroses. Lokasi data, retensi, keamanan, pelaporan insiden.
- **Ekspor dan keluar (exit):** desa dan kabupaten dapat meminta ekspor data agregat; ada prosedur penghapusan bila kontrak berakhir.
- **Harga dan kenaikan:** harga tetap selama jangka kontrak; batas kenaikan tahunan.
- **Jangka waktu:** 1 tahun dengan perpanjangan; evaluasi tengah tahun berdasar indikator.
- **Tanggung jawab dan batasan:** tidak menjamin hasil adopsi; kewajiban kabupaten (surat edaran, fasilitas pelatihan) tertulis.
- **Penggunaan merek/data hasil:** izin menyebut kabupaten sebagai mitra; publikasi angka hanya agregat dan seizin kabupaten.

## 5. Risiko dan mitigasi
| Risiko | Mitigasi |
|---|---|
| Kabupaten sudah punya program sejenis (SIDeKa, OpenSID, sistem sendiri) | Tanyakan lebih dulu; posisikan sebagai pelengkap (layanan warga mobile + dashboard akuntabilitas) |
| Kades enggan karena kabupaten "memaksa" | Kerja sama bersifat rekomendasi; tampilkan hasil desa pilot sebagai bukti |
| Angka rapor desa dipakai untuk menekan desa | Rapor publik **opt-in** oleh desa; dashboard kabupaten menampilkan "belum cukup data" untuk sampel kecil; sepakati cara penggunaan angka di kontrak |
| Nilai kontrak B terlalu kecil dibanding upaya | Hitung biaya dukungan; naikkan biaya dasar atau batasi lingkup |
| Ketergantungan pada satu pejabat | Libatkan beberapa unit (PMD, Diskominfo, kecamatan); dokumentasikan keputusan |

## 6. Yang perlu diputuskan
1. Bentuk awal yang akan ditawarkan: **A saja**, atau A lalu B.
2. Jumlah desa pilot per kabupaten dan jangka pilot (usulan: 5–10 desa, 3 bulan).
3. Siapa kontak resmi (PMD/Diskominfo) di Lumajang dan Kutai Kartanegara, dan siapa dari Klandesa yang menjadi penanggung jawab.
4. Biaya dukungan Klandesa per desa (untuk memastikan tarif B tidak merugikan).
5. Peninjauan konsultan hukum atas draf nota kesepahaman dan perjanjian.
