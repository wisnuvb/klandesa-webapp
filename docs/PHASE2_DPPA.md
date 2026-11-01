# Paket 2 (bagian 6) — DPPA berversi (perubahan DPA setelah Perubahan APB Desa)

Dikerjakan 2026-11-01. Belum di-commit dan belum di-deploy. SQL belum diterapkan ke produksi.

## Masalah yang ditutup
Perubahan APB Desa sudah berversi (versi 0 = APB Desa, 1 dst = perubahan), tetapi DPA per kegiatan hanya satu per tahun. Akibatnya setelah perubahan ditetapkan, DPA yang sudah disetujui tidak lagi sama dengan anggaran. Layar hanya menulis "perlu DPPA", sedangkan kegiatan yang sudah punya SPP tidak bisa dibuka kembali (pesannya menunjuk ke DPPA yang tidak ada). Jalan buntu itu menahan kegiatan yang anggarannya naik, termasuk KDMP yang dianggarkan lewat perubahan APB Desa.

## Cara kerja
- **Revisi dan dasar versi.** `apbdes_activity_plans` mendapat `revision` (0 = DPA awal, 1 dst = DPPA ke-n) dan `baseVersion` (versi APB Desa yang menjadi dasar persetujuan terakhir).
- **Riwayat beku.** Setiap persetujuan Kepala Desa menulis satu baris `apbdes_activity_plan_versions`: revisi, dasar versi, total anggaran, pelaksana, rencana kerja, RAB, RAK per rekening (anggaran + 12 bulan), waktu verifikasi dan persetujuan, penyetuju. Persetujuan ulang pada revisi yang sama (setelah dibuka kembali tanpa perubahan anggaran) menimpa baris revisi itu, bukan menambah.
- **Membuka kembali (`reopen`).**
  - Anggaran kegiatan tidak berubah dan belum ada SPP: seperti sebelumnya, kembali ke draf, revisi tetap.
  - Anggaran kegiatan tidak berubah dan sudah ada SPP: ditolak.
  - Anggaran kegiatan berubah lewat Perubahan APB Desa (rencana penarikan tak lagi sama dengan anggaran): boleh walau sudah ada SPP, revisi naik, yaitu DPPA ke-n. SPP yang sudah ada tidak tersentuh.
- **Selama DPPA disusun** statusnya draf, jadi SPP baru untuk kegiatan itu tertahan (aturan lama: SPP butuh DPA disetujui). SPP yang sudah berjalan tidak terpengaruh.
- **Verifikasi DPPA** selain syarat biasa (rencana penarikan sama dengan anggaran per rekening, ada pelaksana) menolak rencana yang sampai bulan berjalan lebih kecil dari yang sudah terpakai (realisasi bersih ditambah SPP berjalan). Rekening yang anggarannya sudah di bawah pemakaian dilewati, karena itu sudah diperingatkan.
- **Persetujuan** kini memeriksa ulang bahwa rencana penarikan masih sama dengan anggaran (Perubahan APB Desa bisa ditetapkan di antara verifikasi dan persetujuan; sebelumnya tidak diperiksa).
- **Peringatan saat Perubahan APB Desa ditetapkan** (`amendmentWarnings`, ditambahkan pada peringatan penetapan yang sudah ada): jumlah dan nama kegiatan yang DPA-nya sudah diverifikasi/disetujui dan anggarannya berubah, serta rekening yang dianggarkan di bawah realisasi (Perdes tetap berlaku, tetapi pencatatan dan SPP baru pada rekening itu ditolak).
- **SPP yang melebihi RAK lama** setelah anggaran naik kini diberi petunjuk "susun DPPA dulu di tab Pelaksanaan".
- **Cetak** RKK dan RAK menambahkan "(DPPA ke-n)" pada kegiatan yang sudah direvisi.

## Antarmuka
Tab Pelaksanaan (DPA) menampilkan label DPA/DPPA ke-n pada setiap kegiatan, tombol "Susun DPPA" bila anggaran berubah, dan "Lanjutkan DPPA" selama draf. Dialog menampilkan tabel perubahan anggaran (sebelumnya, sekarang, naik/turun, terpakai), jumlah terpakai pada tiap rekening RAK, dan riwayat persetujuan. "Susun DPPA" meminta konfirmasi. Di 390px dialog tidak melebar (tabel bergulir di dalam wadahnya sendiri); semua bagian dialog diberi `min-w-0` (tabel RAB juga berisiko sama sebelumnya).

## Data dan izin
SQL aditif `PHASE2_DPPA_MIGRATION.sql`: dua kolom `INT NOT NULL DEFAULT 0` + satu tabel riwayat (FK ke `villages`, `ON DELETE CASCADE`) + isi awal `baseVersion` untuk DPA yang sudah diverifikasi/disetujui (diperkirakan: versi tertinggi yang sudah ditetapkan pada saat DPA disetujui, dari tanggal ubah dokumen). Rollback `PHASE2_DPPA_ROLLBACK.sql` membuang riwayat; DPA, RAK, RAB, SPP utuh. Dilatih terapkan, rollback, terapkan di DB scratch; `prisma migrate diff` terhadap skema kosong. Diterapkan ke DB dev lokal. **Produksi belum**; urutan rilis SQL: perencanaan, Dana Desa, BLT, PKTD, KDMP, SPP, lalu DPPA (DPPA hanya butuh tabel APBDes yang sudah ada, jadi boleh lebih awal).
Izin tidak berubah: rute `/api/apbdes/dpa/aksi` tetap hanya untuk admin atau sekretaris desa (staf ditolak), persetujuan oleh Kepala Desa (`approve`), semua kueri berfilter `villageId` dari sesi.

## Kunci dan konkurensi
`advancePlan` mengambil kunci tahun APB Desa (`lockYear`, `SELECT … FOR UPDATE` sebagai pernyataan pertama) sehingga verify, approve, reopen, pembuatan SPP, dan simpan RAK terserialisasi per desa-tahun. Tampilan rinci membaca seluruh buku kas tahun itu; hanya dipakai GET DPA dan verifikasi DPPA, bukan jalur cetak.

## Pengujian
`tests/apbdes-dppa.integration.test.ts` (5 tes MySQL): riwayat beku dan penimpaan revisi sama; DPA terkunci bila SPP ada dan anggaran tak berubah; Perubahan APB Desa memunculkan peringatan, SPP baru diarahkan ke DPPA; buka sebagai DPPA walau ada SPP dan SPP lama utuh; SPP tertahan selama DPPA; verifikasi ditolak bila rencana sampai bulan berjalan di bawah terpakai; persetujuan berhasil, riwayat dua revisi, SPP baru dalam RAK baru diterima; perubahan yang tidak menyentuh kegiatan tidak membuka jalan DPPA; peringatan di bawah realisasi; persetujuan ditolak bila anggaran berubah di antara verifikasi dan persetujuan; desa lain tidak terjangkau. Uji mutasi (hapus penjaga → tes harus gagal): cek ulang di persetujuan, cek terpakai, dan kedua arah gerbang DPPA, semuanya tertangkap. Browser sungguhan (Chrome): label dan tombol "Susun DPPA", tabel perubahan anggaran, konfirmasi, verifikasi ditolak dengan pesan terpakai, perbaikan RAK, verifikasi, persetujuan, riwayat dua revisi, daftar menampilkan "DPPA ke-1", 390px tanpa gulir horizontal pada dialog.

## Tinjauan keamanan (agen terpisah) dan perbaikan
Tanpa temuan Kritis/Tinggi; pemisahan desa, otorisasi (persetujuan hanya admin/Kepala Desa, verifikasi/buka-kembali hanya admin/sekretaris), pelewatan kendali (tidak ada jalur klien untuk membuka DPA ber-SPP tanpa perubahan anggaran sungguhan), integritas tulis riwayat, dan migrasi dinyatakan bersih. Satu temuan Sedang dan beberapa Rendah, semuanya diperbaiki dan diuji (uji mutasi tertangkap):
- **Sedang: riwayat tidak membekukan RAB dan rencana kerja; `deleteCostItem` tanpa kunci.** Snapshot kini memuat rencana kerja dan RAB (kolom JSON `work`, `rab`); `deleteCostItem` berjalan dalam transaksi dengan `lockYear`, jadi tak bisa menyela verifikasi/persetujuan.
- **Rendah:** persetujuan DPPA kini memeriksa ulang rencana vs pemakaian (belanja bisa bertambah di antara verifikasi dan persetujuan); revisi hanya naik bila revisi itu pernah disetujui (tak ada nomor kosong); `adoptDocument` dan perubahan baris dokumen (tambah/ubah/hapus baris, hapus dokumen) kini mengambil kunci tahun dan memeriksa ulang status draf di dalamnya; tahun tak valid ditolak sebelum membuat baris tahun.

## Batas yang jujur
- **Persetujuan ulang pada revisi yang sama menimpa riwayatnya.** Terjadi hanya bila DPA dibuka kembali tanpa perubahan anggaran dan belum ada SPP (koreksi sebelum dipakai). Persetujuan pertama tidak tersimpan di riwayat, tetapi tetap ada di jejak audit (aksi, waktu, pengguna).
- **Pergeseran antar objek lewat Peraturan Kepala Desa** (tanpa Perubahan Perdes) belum dibuat; semua perubahan anggaran masuk lewat Perubahan APB Desa. Dasar hukum pembedaan itu belum saya cek ke teks resmi, jadi tidak saya klaim.
- **Tautan ke RKP Desa perubahan** (Pasal 50(4) menurut catatan rencana) belum ada.
- **DPA yang disetujui sebelum rilis ini tidak punya riwayat revisi 0.** Sebagai gantinya kolom "sebelumnya" memakai total rencana penarikan lama selama DPA itu masih menunggu DPPA; riwayat mulai terisi sejak persetujuan berikutnya.
- Isi awal `baseVersion` memakai tanggal ubah dokumen sebagai perkiraan; bila keliru, yang terjadi hanya pemeriksaan "anggaran berubah" memakai pembanding yang berbeda (penanda "perlu DPPA" tetap dihitung dari rencana penarikan terhadap anggaran).
- Membatalkan DPPA yang sedang disusun (kembali ke DPA lama) tidak ada; DPPA harus diselesaikan karena anggaran sudah berubah.
- Pemisahan tugas per orang tidak ditegakkan (sama dengan SPP lain): hanya per peran.
- "Pasal 47" pada teks layar berasal dari teks yang sudah ada sebelumnya, tidak saya cek ulang pada sesi ini.
