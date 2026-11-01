# Paket 3 (P3): Tanah kas desa dan sewa, serta pesanan produk UKM

Status: dikode 2026-11-01. Diuji dengan tes unit dan integrasi MySQL (DB scratch). BELUM disapu di browser dan BELUM dijalankan di perangkat. SQL produksi belum diterapkan.

Dua bagian yang berdiri sendiri: (A) memperluas modul Aset Desa dengan atribut tanah, perjanjian pemanfaatan, tagihan, dan penerimaan ke Buku Kas Umum; (B) pesanan sederhana untuk produk UKM.

## Sumber hukum (Langkah 0)

Dibaca dari teks resmi: Permendagri 1/2016 tentang Pengelolaan Aset Desa, Berita Negara 2016 No. 53 (peraturan.go.id/files/bn53-2016.pdf, teks diekstrak dari PDF resmi dan dibaca pasal per pasal).

| Fakta | Pasal | Status | Dipakai sebagai |
|---|---|---|---|
| Tanah kas desa, pasar desa, tambatan perahu, bangunan desa, dst. = kekayaan asli desa | 2 ayat 2 | [V] | Golongan yang dapat disewakan |
| Aset strategis: tanah kas desa, tanah ulayat, pasar desa, pasar hewan, tambatan perahu, bangunan desa, pelelangan ikan/hasil pertanian, hutan, mata air, pemandian umum, aset lainnya | 4 ayat 3 | [V] | Penanda "aset strategis" (sudah ada di modul Aset) |
| Pemanfaatan hanya bila aset tidak dipakai langsung menunjang pemerintahan desa | 11 ayat 1 | [V] | Teks bantuan; tidak diperiksa mesin |
| Bentuk pemanfaatan: sewa, pinjam pakai, kerja sama pemanfaatan, bangun guna serah / bangun serah guna | 11 ayat 2 | [V] | Tiga bentuk dibangun (kecuali pinjam pakai) |
| Pemanfaatan ditetapkan dalam Peraturan Desa | 11 ayat 3 | [V] | Nomor dan tanggal Perdes WAJIB sebelum perjanjian berlaku |
| Sewa tidak mengubah status kepemilikan; jangka waktu paling lama 3 tahun dan dapat diperpanjang | 12 ayat 1-2 | [V] | Batas 3 tahun keras di server; perpanjangan = perjanjian baru |
| Isi minimal perjanjian sewa: para pihak, objek, jenis/luas/jumlah, besaran sewa, jangka waktu, tanggung jawab penyewa atas biaya operasional dan pemeliharaan, hak dan kewajiban, force majeure, persyaratan lain | 12 ayat 3 | [V] | Kolom perjanjian; tanggung jawab biaya dan centang force majeure wajib sebelum berlaku |
| Pinjam pakai: hanya antar-Pemdes / Lembaga Kemasyarakatan, tidak untuk tanah, bangunan, kendaraan, paling lama 7 hari | 13 | [V] | Tidak dibangun (memang di luar tanah) |
| Kerja sama pemanfaatan tanah/bangunan: kontribusi tetap tiap tahun dan bagi hasil lewat rekening Kas Desa; paling lama 15 tahun; isi surat perjanjian | 14 ayat 3-4 | [V] | Batas 15 tahun; tagihan "Kontribusi" |
| Kerja sama pemanfaatan hanya bila dana APBDes tidak ada/tidak cukup untuk biaya operasional dan pemeliharaan | 14 ayat 2 huruf a | [V] | TIDAK diperiksa mesin (butuh penilaian manusia); tercatat sebagai batas |
| BGS/BSG: kontribusi ke rekening kas desa tiap tahun; besaran dari perhitungan tim Pemda Kab/Kota; paling lama 20 tahun; perpanjangan lewat evaluasi tim | 15, 16 | [V] | Batas 20 tahun; besaran kontribusi diisi operator (tidak dihitung) |
| Kerja sama pemanfaatan dan BGS/BSG baru dilaksanakan setelah izin tertulis Bupati/Wali Kota | 17 | [V] | Nomor dan tanggal izin WAJIB untuk dua jenis ini. Untuk SEWA izin TIDAK diwajibkan |
| Hasil pemanfaatan = pendapatan desa dan wajib masuk rekening Kas Desa | 18 | [V] | Penerimaan dicatat sebagai PENERIMAAN PADes di Buku Kas Umum; pilihan saluran bank/tunai dengan catatan agar disetor |
| Pengamanan: administrasi, pemagaran dan tanda batas tanah, melengkapi bukti status kepemilikan | 19 ayat 2 | [V] | Atribut batas dan bukti hak; peringatan bila belum bersertipikat |
| Penghapusan aset strategis perlu Berita Acara dan persetujuan Bupati/Wali Kota | 22 | [V] | Sudah ada di modul Aset (Paket sebelumnya) |
| Tanah/bangunan desa hanya dapat dipindahtangankan lewat tukar-menukar dan penyertaan modal; penyertaan modal berupa tanah kas desa | 25 ayat 2, 27 | [V] | Tidak dibangun; dicatat sebagai batas |
| Penilaian oleh Penilai Pemerintah/Publik untuk pemanfaatan dan pemindahtanganan tanah/bangunan | 30 | [V] | Kolom rujukan penilaian; peringatan (bukan penghalang) bila kosong |
| Kode rekening PADes "Hasil Aset" 4.1.2.01 (Pengelolaan Tanah Kas Desa), .02 Tambatan Perahu, .03 Pasar Desa, .04 Pemandian, .05 Irigasi, .06 Pelelangan Ikan, .07 Kios, .08 Lapangan/prasarana olahraga, .90-99 lain-lain | Permendagri 20/2018 lampiran A.2 | [V] dari fase APB Desa (sudah di katalog `lib/apbdes/codes.ts`) | Daftar pilihan rekening; dibaca dari katalog yang ada, bukan disalin |
| Istilah jenis bukti hak (sertipikat hak milik/hak pakai/hak pengelolaan/HGB, Letter C, girik/petok D, persil) | - | [R] belum diverifikasi ke teks resmi | Label yang dapat disunting di `lib/aset-desa/land-catalog.ts`; layar menyatakan "istilah belum diverifikasi" |
| Girik/Letter C/petok D tak lagi berlaku sebagai bukti hak mulai Februari 2026 (PP 18/2021 pasal 96) | - | [R] hanya dari pemberitaan; teks resmi belum dibaca | TIDAK ditanam sebagai aturan. Layar hanya menyarankan pendaftaran |
| "Tanah bengkok" (penghasilan perangkat) sebagai kategori pemanfaatan | - | [R] | Hanya label status pemanfaatan, tanpa aturan |
| Ambang peringatan 30 hari (tagihan) dan 90 hari (perjanjian berakhir) | - | Kebijakan aplikasi, BUKAN hukum | `WARN` di `land-catalog.ts` |

Temuan yang mengoreksi rencana: rencana P3 menyebut "aset strategis butuh persetujuan bupati" untuk sewa. Teks resmi mensyaratkan izin Bupati untuk KERJA SAMA PEMANFAATAN dan BGS/BSG (Pasal 17) dan untuk PENGHAPUSAN aset strategis (Pasal 22), tetapi TIDAK untuk sewa. Sistem mengikuti teks: izin wajib untuk dua jenis itu; untuk sewa atas aset strategis hanya ada catatan "periksa Peraturan Bupati setempat" dan kolom izin opsional.

## Bagian A: Tanah kas desa dan pemanfaatan aset

### Dibangun
- `land_parcels`: atribut tanah 1:1 dengan barang inventaris golongan Tanah kas desa / Tanah / Tanah ulayat: luas (m2), letak, batas empat arah, bukti hak (jenis, nomor, atas nama, tanggal, persil, Letter C), status pemanfaatan, catatan.
- `land_agreements`: perjanjian SEWA / KERJASAMA / BGS_BSG atas barang inventaris yang dapat dimanfaatkan: pihak, objek (luas sebagian opsional), jangka waktu, periode pembayaran (bulan/tahun/sekali), besaran (BigInt sen), rekening PADes 4.1.2.x, tanggung jawab biaya, force majeure, Perdes, izin Bupati, rujukan penilaian. Status DRAF, AKTIF, SELESAI, BATAL.
- `land_charges`: jadwal tagihan dibuat saat perjanjian diberlakukan (jatuh tempo di awal tiap periode). Status BELUM, DITERIMA, BATAL.
- `land_agreement_docs`: lampiran berupa tautan ke dokumen Arsip Digital desa yang sama (berkas tidak disalin).
- `lib/aset-desa/land-{catalog,calc,schema,service}.ts`. Modul Aset lama (`service.ts`) hanya diubah di `disposeItem`.
- API (resource izin `aset_desa`): `/api/aset-desa/tanah` (GET), `/tanah/[itemId]` (PUT), `/pemanfaatan` (GET, POST), `/pemanfaatan/ringkasan`, `/pemanfaatan/objek`, `/pemanfaatan/[id]` (GET, PATCH, DELETE draf), `/pemanfaatan/[id]/aksi` (aktifkan, akhiri, batalkan), `/pemanfaatan/[id]/dokumen` (POST, DELETE), `/pemanfaatan/tagihan/[id]/terima` dan `/batal-terima`.
- Layar `/aset-desa/pemanfaatan` (tombol "Tanah kas & sewa" di halaman Aset Desa): tab Ringkasan dan peringatan, Tanah, Perjanjian; dialog data tanah, formulir perjanjian, rincian perjanjian (syarat yang belum terpenuhi, jadwal tagihan, catat/batalkan penerimaan, lampiran, akhiri/batalkan).

### Cara kerja
1. Operator melengkapi data tanah (opsional tetapi disarankan), membuat draf perjanjian (batas jangka waktu dan kelipatan periode dihitung di server).
2. "Berlakukan": server memeriksa syarat wajib (nomor dan tanggal perjanjian, Perdes, tanggung jawab biaya, force majeure, izin Bupati untuk KSP/BGS-BSG), memastikan tidak tumpang tindih dengan perjanjian berlaku pada objek yang sama (luas sebagian boleh selama jumlahnya tidak melebihi luas tanah; luas tak tercatat dianggap seluruh objek), lalu membuat jadwal tagihan.
3. "Catat diterima": dalam SATU transaksi, tagihan ditandai diterima dan sebuah catatan PENERIMAAN dibuat lewat `createEntryInTx` (rekening 4.1.2.x, tanpa kegiatan, jumlah = tagihan, tanggal = tanggal diterima). `apbdes_entries` tidak pernah ditulis langsung. Bulan yang sudah ditutup di Buku Kas Umum menolak penerimaan, dan seluruh transaksi dibatalkan.
4. "Batalkan penerimaan": catatan Buku Kas Umum dihapus lewat `deleteEntryInTx` (bulan ditutup menolak), tagihan kembali BELUM.
5. Akhiri (SELESAI): tagihan yang belum jatuh tempo dibatalkan, yang sudah jatuh tempo tetap ditagih, dan tunggakan itu MASIH DAPAT diterima (juga dikoreksi) sesudah perjanjian SELESAI; tampil di peringatan selama belum lunas. Perjanjian BATAL dan DRAF tidak pernah menerima, dan tagihan yang jatuh tempo sesudah tanggal berakhir ditolak walau datanya rusak (pertahanan berlapis). Batalkan (BATAL): hanya bila belum ada penerimaan.
6. Peringatan (halaman, bukan push): tagihan terlambat, jatuh tempo 30 hari, perjanjian berakhir/segera berakhir, penerimaan yang catatan Buku Kasnya hilang atau jumlahnya berbeda, aset strategis tanpa izin (info), penilaian belum dicatat, tanah belum bersertipikat atau belum dilengkapi.
7. Barang dengan perjanjian AKTIF tidak dapat dihapus dari buku inventaris (Pasal 21-23) sampai perjanjiannya diakhiri.

### Data dan izin
- Izin: semua rute `/api/aset-desa/**` memakai `aset_desa` (admin dan sekretaris CRUD, kades baca, staf baca). KECUALI `tagihan/[id]/terima` (apbdes:create) dan `tagihan/[id]/batal-terima` (apbdes:delete) lewat `PATTERN_RULES` di `lib/permissions/api-route-map.ts`, karena keduanya menulis Buku Kas Umum: Kaur Keuangan boleh, kades tidak.
- `villageId` selalu dari sesi. Data penyewa (nama, alamat, kontak) hanya ada di rute izin `aset_desa`; tidak ada di API mobile/publik. Audit hanya memuat id, jenis, tanggal, status; bukan nama atau nominal penyewa.
- Tidak ada NIK penyewa yang disimpan.

### Kunci dan konkurensi
- Aktifkan, akhiri, batalkan perjanjian, dan hapus barang dari buku: `SELECT ... FOR UPDATE` pada baris `inventory_items` sebagai pernyataan PERTAMA transaksi (`lockItem`, `disposeLocked`).
- Terima/batalkan penerimaan: kunci baris barang LEBIH DULU (sama dengan jalur lain), lalu `lockYear` (kunci tahun APB Desa), lalu klaim baris tagihan dengan UPDATE bersyarat status. Urutan kunci seragam di semua jalur: barang lalu tahun; tidak ada jalur yang memegang tahun lalu meminta barang (aktifkan, akhiri, batalkan, `disposeItem` hanya memegang barang).
- Penerimaan memakai kunci APB Desa yang sama dengan modul lain yang menulis Buku Kas Umum.

### Tes
- `tests/aset-tanah.test.ts` (31 uji unit): batas pasal, tanggal/bulan, jadwal, tumpang tindih, syarat berlaku, peringatan, validasi isian jahat, pemetaan izin rute.
- `tests/aset-tanah.integration.test.ts` (19 uji, MySQL nyata): atribut tanah, isolasi desa, siklus perjanjian, tumpang tindih, balapan aktivasi, balapan hapus-barang vs aktivasi, penerimaan ke Buku Kas Umum, klik ganda, bulan ditutup (terima dan batalkan), catatan Buku Kas hilang/diubah dari luar, akhiri/batalkan, lampiran, ringkasan.
- `tests/aset-tanah-render.test.tsx` (3 uji render server).
- Uji mutasi (kunci dicabut, tes harus gagal; dijalankan dan DIPULIHKAN): tanpa `lockItem` pada aktivasi, tes 5 dan 6 gagal; klaim tagihan tanpa syarat `status: "BELUM"`, tes 8, 9, 15, 16 gagal; tanpa kunci baris pada `disposeLocked`, tes 6 gagal.

## Bagian B: Pesanan produk UKM

### Dibangun
- `ukm_order_requests` (pesanan: salinan nama produk/harga/satuan, jumlah, pembeli, penjual saat dipesan, catatan, status, kunci `activeKey`) dan `ukm_order_events` (riwayat status). Produk ada di `potentials`; menghapus produk tidak menghapus pesanan (salinan nama tetap).
- Status: DIMINTA, DIKONFIRMASI, SELESAI, DIBATALKAN. Pembeli membatalkan hanya saat DIMINTA. Penjual (pemilik produk) dan admin: konfirmasi, selesai, batal (batal wajib beralasan). Pesanan produk yang dikelola desa (tanpa pemilik) ditangani admin. Tanpa pembayaran online.
- API mobile: `POST /api/mobile/v1/ukm/{id}/pesan`, `GET /ukm/pesanan?peran=beli|jual&status=&cursor=`, `GET|PATCH /ukm/pesanan/{id}`.
- API web admin (resource `ukm`, tanpa perubahan peta izin karena awalan `/api/ukm-products` sudah ada): `GET /api/ukm-products/pesanan`, `GET|PATCH /api/ukm-products/pesanan/{id}`.
- Web: halaman `/ukm/pesanan` (penyaring status berhitung, pencarian, "hanya produk dikelola desa", dialog tindak lanjut dengan riwayat), tautan "Pesanan produk" di halaman `/ukm`.
- Mobile (diverifikasi `tsc` dan tes logika murni, belum di perangkat): tombol "Pesan produk ini" di detail produk, layar `ukm/pesanan/baru`, `ukm/pesanan/index` (Pesanan saya / Pesanan masuk), `ukm/pesanan/[id]`.

### Aturan kontak (dihormati)
- Tautan WhatsApp (`wa.me`) dibuat server HANYA bila `contactVisible` dan produk `active`, dihitung ulang tiap pembacaan. Jika pemilik menyembunyikan kontak, atau produk disembunyikan/ditutup sesudah dipesan, tautan menghilang. Tidak ada nomor penjual yang keluar di luar tautan itu, dan penjual tidak pernah menerima nomor pembeli.
- Produk tak tayang (pending/hidden/inactive), non-UKM, dan produk desa lain tidak dapat dipesan (404).
- Penjual melihat pembeli sebagai "Budi S." plus dusun; admin melihat nama lengkap dan dusun. Tidak ada NIK, nomor telepon, atau id warga di JSON.

### Kunci dan konkurensi
- Satu pesanan terbuka per pembeli per produk: kunci unik nullable `activeKey` ("produk:pembeli" selama DIMINTA/DIKONFIRMASI, null sesudahnya). CHECK di SQL: `activeKey` hanya boleh terisi selama status terbuka.
- Perubahan status: UPDATE bersyarat atas status lama; dua aktor bersamaan (mis. penjual konfirmasi dan pembeli batal), tepat satu menang, yang kalah menerima 409.
- Batas: 10 pesanan terbuka per pembeli, 20 pesanan per 24 jam, 10 permintaan per 10 menit per akun (pembatas laju di memori seperti modul mobile lain).

### Tes
- `tests/ukm-pesanan.test.ts` (15 uji unit): tabel transisi, kunci, WhatsApp/kontak, stok, validasi.
- `tests/ukm-pesanan.integration.test.ts` (13 uji, MySQL nyata): rute mobile dan layanan admin, aturan kontak, isolasi desa/pihak, balapan pesanan ganda, balapan konfirmasi vs batal, batas, produk dihapus, notifikasi.
- `mobile/tests/ukm-order-logic.test.ts` (6 uji).
- Uji mutasi (dijalankan dan DIPULIHKAN): `activeKey` dimatikan, tes 4 dan 5 gagal; UPDATE tanpa syarat status lama, tes 8 gagal; kontak tanpa syarat produk tayang, tes kontak gagal (unit dan integrasi); `villageId` dibuang dari `actOnOrder`, tes admin gagal.

## SQL dan latihan
`docs/PHASE3_ASET_MIGRATION.sql` (6 tabel, 13 CHECK) dan `docs/PHASE3_ASET_ROLLBACK.sql`. Dilatih di `klandesa_aset_scratch2` (dibuat dari snapshot sebelum Paket 3): 181 tabel, terapkan menjadi 187 dengan 13 CHECK, rollback kembali 181, terapkan lagi, lalu `prisma migrate diff` terhadap skema tidak menyebut satu pun tabel `land_`/`ukm_order_`. CHECK tidak terlihat oleh Prisma. Jangan `db push` ke produksi.

## Tinjauan keamanan independen (diperbaiki)
- Balapan terima tagihan vs batalkan perjanjian: `closeAgreement` (kunci barang) menghitung DITERIMA sementara `receiveCharge` (hanya kunci tahun) bisa lolos, menghasilkan perjanjian BATAL dengan tagihan DITERIMA dan entri Buku Kas. Perbaikan: `receiveCharge` dan `revertReceipt` kini mengunci barang dulu. Tes `KONKURENSI: membatalkan perjanjian vs mencatat penerimaan` (12 putaran, Promise.all, juga memeriksa jumlah entri Buku Kas = tagihan diterima). Uji mutasi: kunci barang dicabut dari `receiveCharge`, tes gagal tiga kali berturut-turut; dipulihkan.
- Batas pesanan UKM dihitung di luar transaksi sehingga permintaan paralel ke produk berbeda melewati batas 10 terbuka. Perbaikan: penghitungan batas dan pembuatan pesanan satu transaksi di bawah `SELECT ... FOR UPDATE` pada baris `residents` pembeli (pernyataan pertama). Tes: 14 pesanan paralel ke 14 produk menghasilkan tepat 10. Uji mutasi: kunci dicabut, tes gagal tiga kali; dipulihkan.
- Spam batal-lalu-pesan-ulang: dibatasi 3 pesanan per pembeli per produk per 24 jam (pesanan dibatalkan ikut dihitung), selain batas 20 per hari dan 10 terbuka. Tes ada.
- `sellerResidentId` adalah SNAPSHOT pemilik saat dipesan (lihat Batas yang jujur).

## Temuan uji browser (diperbaiki)
- Tunggakan perjanjian SELESAI tidak dapat dicatat diterima padahal teks layar menyatakan tetap ditagih: `receiveCharge` kini menerima perjanjian AKTIF atau SELESAI (urutan kunci barang lalu tahun tidak berubah) dan, bagi SELESAI, menolak tagihan yang jatuh tempo sesudah tanggal berakhir. Tombol "Catat diterima" tampil untuk status AKTIF dan SELESAI; ringkasan/peringatan ikut membaca perjanjian SELESAI yang masih punya tunggakan. Tes: tunggakan diterima dan dikoreksi, tagihan BATAL ditolak, BATAL/DRAF ditolak, balapan akhiri vs terima (10 putaran). Uji mutasi: syarat status dicabut, tes gagal; pemeriksaan jatuh tempo-vs-berakhir dicabut, tes gagal; kunci barang dicabut dari `receiveCharge`, tes balapan gagal.
- Tombol "Buka", "Catat diterima", "Batalkan penerimaan", dan tombol kartu tanah kini ber-`aria-label` yang menyebut perjanjian/tanah/jatuh tempo.
- Catatan Buku Kas sewa kini dikunci dari menu APB Desa oleh modul APB Desa (pekerjaan agen lain); deteksi BKU_HILANG/BKU_BEDA tetap ada sebagai jaring pengaman untuk perubahan lewat jalur lain, dan tesnya menyimulasikan kehilangan lewat SQL langsung.

## Batas yang jujur
- Tidak disapu di browser dan tidak diuji di perangkat. Layar web hanya dites render server (tanpa interaksi). Layar mobile hanya lolos `tsc`, ESLint, dan tes logika murni.
- Tagihan hanya bisa diterima PENUH (tanpa cicilan sebagian), tanpa denda keterlambatan, tanpa uang jaminan, jatuh tempo selalu di awal periode.
- Tidak ada pengingat otomatis (push/email/cron). Peringatan hanya tampil di halaman.
- Catatan Buku Kas Umum bertaut lewat `entryId` TANPA kunci asing (tabel milik modul APB Desa tidak diubah). Menghapus atau mengubah catatan itu langsung dari layar Buku Kas Umum tidak dicegah; hanya terdeteksi sebagai peringatan BKU_HILANG / BKU_BEDA dan dapat diperbaiki dengan membatalkan lalu mencatat ulang.
- Perpanjangan perjanjian = membuat perjanjian baru (tidak ada alur "perpanjang" dan tidak ada evaluasi tim BGS/BSG). Besaran kontribusi BGS/BSG tidak dihitung (Pasal 15 ayat 3: dihitung tim Pemda).
- Syarat Pasal 14 ayat 2 huruf a (dana APBDes tidak cukup) dan Pasal 11 ayat 1 (aset tidak dipakai langsung) tidak diperiksa mesin.
- Belum ada: SK penggunaan aset tahunan (Pasal 10), pinjam pakai, pemindahtanganan, sewa barang bergerak (Pasal 4 ayat 2 huruf g), peta/koordinat tanah (titik peta `mapAssetId` ada di API Aset tetapi belum dipilih di layar), ekspor/cetak surat perjanjian, alat baca Laras.
- Mengubah golongan barang yang sudah punya data tanah/perjanjian lewat layar Aset tidak diblokir.
- Lampiran: berkas privat di Arsip Digital hanya dapat dibuka pengunggahnya (aturan modul arsip); tautan "Buka" bisa ditolak untuk pengguna lain.
- Pesanan: `sellerResidentId` adalah snapshot pemilik saat dipesan. Bila produk dialihkan ke warga lain (admin mengganti pemilik), pesanan lama tetap milik penjual semula dan penjual baru tidak melihatnya; admin tetap dapat menanganinya. Stok TIDAK dipotong otomatis (hanya diperiksa saat memesan); tidak ada penutupan otomatis pesanan yang menggantung; produk yang dikelola desa tidak punya nomor kontak (layar admin produk tidak mengisinya), jadi pembelinya tidak mendapat tautan WhatsApp dan admin yang menanggapi lewat aplikasi; pembayaran LinkQu belum ada.

## Keputusan yang menunggu pemilik
1. Apakah Peraturan Bupati Karanganyar mensyaratkan izin untuk SEWA aset strategis? Teks Permendagri tidak; sistem hanya memberi catatan.
2. Cicilan sebagian, denda keterlambatan, dan uang jaminan sewa: perlu?
3. Pengingat tagihan terlambat/segera berakhir lewat notifikasi staf (butuh cron): dibuat?
4. Kontak untuk produk yang dikelola desa (mis. nomor WhatsApp kantor desa): tambah kolom di layar admin produk?
5. Stok produk dipotong saat pesanan dikonfirmasi? Pesanan DIMINTA yang menggantung dibatalkan otomatis setelah berapa hari?
6. Penerimaan sewa memakai izin `apbdes` (Kaur Keuangan boleh, sekretaris boleh, kades tidak): sesuai?
7. Pembayaran LinkQu untuk pesanan UKM, setelah ada operator nyata.
