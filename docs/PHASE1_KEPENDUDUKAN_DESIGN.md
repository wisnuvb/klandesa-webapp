# Fase 1: Kependudukan v2 (KK, wilayah, mutasi) + pemetaan Satu iDesa

Tanggal: 2026-10-31. Status: **tahap A selesai (lokal + produksi, tabel kosong); tahap C–D sudah dikode dan teruji di MySQL sementara, BELUM di-deploy; bendera `kependudukanV2` mati untuk semua desa.** Rincian di §12.
Induk: [PLATFORM_STRATEGY.md](PLATFORM_STRATEGY.md) §6 Fase 1. Berkas pendukung:
`lib/kependudukan/{household,wilayah,mutation,report}.ts` (+ `tests/kependudukan.test.ts`, 19 tes),
`docs/PHASE1_KEPENDUDUKAN_SCHEMA.diff` (usulan skema, bisa di-`patch`), `docs/PHASE1_KEPENDUDUKAN_MIGRATION.sql` (SQL draf).

## 1. Prinsip: tidak boleh ada yang rusak

1. **Aditif.** Tidak ada kolom lama yang diubah/dihapus. Satu-satunya perubahan pada tabel lama: `residents` + 3 kolom `NULL` (`householdId`, `wilayahUnitId`, `dusunUnitId`) beserta indeks dan FK. Diperiksa pada SQL: tidak ada `DROP`/`MODIFY`/`RENAME`.
2. **Kolom lama tetap sumber kebenaran.** `residents.kk/rt/rw/hamlet/familyRole/isAlive/moveDate/deathDate` tetap dibaca dan ditulis oleh 52 berkas yang ada (38 di antaranya memakai `kk`). Struktur baru adalah *bayangan* yang disinkronkan, sehingga UI, mobile, impor, dan surat lama tetap benar tanpa diubah.
3. **Per desa lewat bendera.** `Village.settings.kependudukanV2` (default mati). Mati = perilaku persis seperti sekarang. Hidup = sinkronisasi + fitur baru.
4. **Idempotent & dapat diulang.** Backfill dan rekonsiliasi dapat dijalankan berulang tanpa efek samping; hasilnya tidak bergantung urutan data (teruji).
5. **Tidak ada pemblokiran mendadak.** Validasi baru (RT/RW harus dari master, KK wajib) mulai sebagai peringatan, lalu dapat diperketat per desa.

## 2. Fakta kondisi sekarang (diverifikasi di kode)

- Tujuh titik yang menulis tabel warga: `residents` POST, `residents/[id]` PUT/PATCH/DELETE, `residents/bulk` (createMany + update), `posyandu/visits` (kolom kesehatan), keputusan koreksi data mobile (kolom "aman", `kk` tidak otomatis).
- KK hanya string; `/api/kk` = `groupBy`, baca-saja. Mutasi hanya flag (`isAlive`, `deathDate`, `moveDate`); `residentLeavesVillage` sudah menonaktifkan akun mobile bila meninggal/pindah.
- RT/RW/dusun string bebas ("01", "1", "001" tidak disatukan).
- Hapus warga = `DELETE` permanen; jejak hanya `AuditLog` (kini ada, tanpa isi warga).
- Templat surat `cat_kep_sk_pindah/_datang/_lahir/_mati` sudah ada: mutasi dapat tertaut ke surat nanti.

## 3. Model data (ringkas; lengkap di `.diff`)

| Tabel | Isi | Catatan |
|---|---|---|
| `households` | KK sebagai entitas: `kkNumber` (unik per desa), `headResidentId`, alamat, RT/RW/dusun, `wilayahUnitId`, `status` | `ON DELETE SET NULL` ke kepala: menghapus warga tidak memblokir |
| `wilayah_units` | **dua pohon terpisah**: dusun (datar) dan RW → RT; `canonicalKey` unik per desa ("01" = "1") | dusun dan RW saling silang (lihat §4); `parentId` RESTRICT: RW tak bisa dihapus selagi punya RT |
| `resident_mutations` | buku mutasi: jenis, status, sumber, tanggal kejadian, cuplikan nama/RT/RW/KK, `details` JSON, pengaju/pemutus | cuplikan agar tetap terbaca setelah warga dihapus; **tanpa NIK lengkap** |
| `resident_archives` | cuplikan penuh warga sebelum dihapus permanen | pengganti *soft delete* (lihat §4) |
| `residents` (+3 kolom) | `householdId`, `wilayahUnitId` (RW/RT), `dusunUnitId` | nullable |

Jenis mutasi: `BIRTH`, `DEATH`, `MOVE_OUT`, `MOVE_IN`, `KK_CHANGE`. Status: `PENDING → APPLIED | REJECTED | CANCELLED`. Sumber: `web | mobile | import | legacy_edit`.

## 4. Keputusan desain penting

**Pengganti soft delete = `resident_archives`, bukan `deletedAt`.** `deletedAt` pada `residents` memaksa menambah filter di 52 berkas; satu yang terlewat = warga yang sudah dihapus muncul lagi di statistik/surat/mobile. Arsip snapshot saat hapus memberi jejak dan kemampuan pulih tanpa mengubah satu pun kueri. Konsekuensi: snapshot memuat NIK, jadi perlu masa simpan (usulan 12 bulan, lalu dibersihkan terjadwal).

**Dusun dan RW saling silang, jadi wilayah = dua pohon, bukan satu.** Rancangan awal menaruh RW di bawah dusun. Uji coba pada data nyata membuktikannya salah: dua dusun besar sama-sama memakai RW 01–04, sehingga RW yang sama terhitung berkali-kali (muncul "81 RW" untuk satu desa; setelah dibenahi menjadi 20, sisanya data uji). Permendesa 13/2025 Ps 59 juga menyebut batas dusun, RW, dan RT sebagai tiga lapisan terpisah. Maka: dusun = daftar datar; RW → RT = pohon; warga/rumah tangga menunjuk keduanya (`dusunUnitId`, `wilayahUnitId`).

**Kepala keluarga dan KK lintas RT hanya dilaporkan, tidak dipaksa.** Data nyata berantakan; backfill mengeluarkan laporan anomali (`NO_HEAD`, `MULTIPLE_HEADS`, `HEAD_NOT_ACTIVE`, `SPLIT_ACROSS_RT`, `INVALID_KK`, `MISSING_KK`) per desa agar operator memperbaiki, bukan menolak data.

**Kelahiran boleh diajukan tanpa NIK, tidak boleh diterapkan tanpa NIK.** NIK `residents` wajib dan unik; bayi sering belum punya NIK saat dilaporkan. Status `PENDING` menampung sampai akta/NIK ada. NIK divalidasi cocok dengan tanggal lahir dan jenis kelamin (aturan yang sama dengan impor).

**Mutasi dari suntingan langsung tetap tercatat.** `detectLegacyEditMutations` membandingkan sebelum/sesudah di PUT/PATCH lama dan menulis mutasi `APPLIED` dengan sumber `legacy_edit`. Laporan tetap utuh walau operator belum memakai alur mutasi.

**Peran.** Mengajukan: `admin, secretary, staff`. Memutuskan: `admin, secretary, village_head`. Penerapan satu transaksi: ubah warga + mutasi + audit + nonaktifkan akun mobile bila perlu.

## 5. Sinkronisasi di titik tulis (bendera hidup)

| Titik tulis | Tambahan |
|---|---|
| `residents` POST | cari/buat `household` dari `kk`; set kepala bila `familyRole` kepala dan belum ada; cari/buat unit wilayah; semua dalam transaksi yang sama |
| `residents/[id]` PUT/PATCH | sinkron ulang bila `kk/rt/rw/hamlet/familyRole` berubah; catat mutasi `legacy_edit` |
| `residents/[id]` DELETE | tulis `resident_archives` dalam transaksi yang sama sebelum `delete`; kosongkan kepala/ubah status rumah tangga |
| `residents/bulk` | `createMany` tidak mengembalikan id → jalankan **rekonsiliasi desa** sekali setelah batch; mode "status" mencatat mutasi `import` |
| koreksi mobile | tidak perlu (kolom aman tak memengaruhi struktur); perubahan `kk` oleh staf lewat PUT |
| posyandu visits | tidak perlu |

**Rekonsiliasi** (`reconcileVillage`): menghitung ulang rencana dari `residents` (fungsi murni di `lib/kependudukan/`), upsert rumah tangga/unit, set `householdId/wilayahUnitId`, melaporkan penyimpangan. Dijalankan setelah impor, harian terjadwal, dan sebelum rilis tiap desa. Bila sinkronisasi di titik tulis gagal, **penulisan warga tetap sukses** dan desa ditandai butuh rekonsiliasi (tidak boleh menggagalkan layanan).

## 5b. Hasil uji coba pada data nyata (tahap B, baca-saja, 2026-10-31)

Skrip: `npx tsx --env-file=.env scripts/kependudukan-dryrun.ts` (tidak menulis; laporan memuat id warga dan 4 digit akhir KK saja, tanpa nama/NIK/alamat; dijaga tes statis). Dijalankan pada DB lokal (4 desa; hanya **Desa Bedahan** berisi warga):

| Ukuran | Desa Bedahan |
|---|---|
| Warga | 2.473 (semua aktif) |
| Rumah tangga (KK sah) | 830; berkepala 737; **bermasalah 97 (bersih 88,3%)** → "PERLU PERBAIKAN" (ambang siap 95%) |
| Warga tanpa KK sah | 150 = 72 kosong + 78 bukan 16 digit |
| KK tak sah | semuanya terlalu pendek (12–15 digit, 6 digit); **10 diduga terpotong Excel** (15 digit berakhiran 0); tidak ada notasi ilmiah/spasi |
| Anomali | 93 KK tanpa kepala, 4 KK tersebar lintas RT/RW |
| Wilayah | 12 dusun, 20 RW, 97 RT; 1 warga tanpa wilayah; varian "1"↔"01" akan digabung |

Pelajaran untuk rancangan:
1. **Kualitas KK adalah masalah utama, bukan struktur.** 150 warga (6%) tidak bisa masuk rumah tangga mana pun; ini harus dibereskan operator lewat daftar kerja, bukan ditolak oleh sistem. Alat pembetulan (cari KK yang mirip, tautkan ke rumah tangga) lebih berguna daripada validasi ketat.
2. **93 KK tanpa kepala** kemungkinan hanya kolom "hubungan keluarga" yang belum diisi; tawarkan "tetapkan kepala" satu klik berdasarkan usia/jenis kelamin sebagai saran (bukan otomatis).
3. **Sebagian data adalah data uji** (11 "Dusun Indah/Jaya/…" ±100 warga, RW 3–20). Uji sebenarnya harus pada data desa pilot Karanganyar.

## 5c. Alat perbaikan data KK (sudah dibangun, tidak butuh skema baru)

Karena masalah utama data adalah kualitas KK, bukan struktur (§5b), alat ini dibangun lebih dulu dan berjalan di atas kolom lama.

- Halaman `/data-warga/kualitas` + banner pengingat di Data Warga. API baca-saja `GET /api/kependudukan/kualitas`; perbaikan diterapkan lewat `PATCH /api/residents/[id]` yang sudah berguard dan beraudit (jadi tiap perubahan tercatat di riwayat).
- Daftar kerja dengan saran **beralasan dan berkeyakinan** (Yakin / Perlu dicek / Kurang yakin). Bukti: nama dan NIK orang tua, anak-anak yang menyebut namanya, KK kurang satu angka (kandidat kembar disaring bukti keluarga), alamat khas, peran "Suami". Pagar konflik: saran tidak boleh menyatukan kepala ke KK yang sudah punya kepala atau ke RT/RW berbeda.
- **Tombol massal hanya untuk "Yakin"**, dengan dialog konfirmasi dan "Urungkan semua". Terukur pada data Bedahan: menerapkan 15 saran Yakin menghapus 15 temuan tanpa anomali baru; menerapkan juga yang "Perlu dicek" (109 saran) menimbulkan 8 KK berkepala ganda dan 11 KK lintas RT, sehingga sengaja tidak diizinkan massal.
- Temuan baru dari data nyata: hubungan keluarga tak baku ("KKKK" pada 31 warga, kosong pada 15) menjadi jenis temuan tersendiri; 92 dari 93 "KK tanpa kepala" ternyata serpihan satu orang yang kepalanya ber-KK rusak, jadi akan selesai sendiri setelah KK diperbaiki.
- Privasi: respons tidak memuat NIK (teruji, termasuk pada 2.473 warga nyata); nama dikirim hanya karena operator perlu mengenali warga.

## 6. Rencana penerapan bertahap (tiap langkah dapat dihentikan)

| Tahap | Isi | Risiko | Pembatalan |
|---|---|---|---|
| A | Terapkan SQL aditif di staging, lalu produksi. Kode belum memakainya | sangat rendah | `DROP TABLE` ×4 + 3 kolom (tidak ada data bernilai) |
| B | Skrip backfill **dry-run**: laporan anomali per desa, tidak menulis | nol | hapus skrip |
| C | Backfill nyata untuk desa yang menyalakan bendera (idempotent) | rendah | bendera mati; tabel dibiarkan |
| D | Sinkronisasi titik tulis + API mutasi + tampilan rumah tangga/wilayah/laporan | sedang (kode baru) | bendera mati = perilaku lama |
| E | Perketat validasi per desa (RT/RW dari master, KK wajib) | sedang (UX) | lepas per desa |

Desa pilot untuk C–D: **Karanganyar (Lumajang)**, dengan data nyata mereka.

## 7. API, tampilan, mobile (tahap D)

- API di `/api/kependudukan/*` (dipetakan ke sumber daya `residents` pada `lib/permissions/api-route-map.ts`, masuk tes guard & audit yang ada): `households` (daftar, detail, ganti kepala, pindah anggota), `wilayah` (pohon, tambah/gabung unit), `mutasi` (ajukan, putuskan, batalkan, daftar), `laporan/mutasi` (per bulan/RT-RW, CSV).
- Web: halaman rumah tangga (anggota, kepala, anomali), editor wilayah (gabungkan varian "01"/"1"), buku mutasi + formulir per jenis, rekap bulanan. Satu langkah aksi, bahasa awam (hindari istilah teknis di UI).
- Mobile: tidak ada perubahan wajib. Opsional kemudian: warga melaporkan kelahiran/meninggal sebagai `PENDING` (sumber `mobile`) untuk diputuskan desa.

## 8. Pemetaan Satu iDesa (Permendesa PDT 13/2025 Ps 57 ayat 2) dan cakupan data kita

| | Kategori Data Desa | Data kita sekarang | Celah / tahap |
|---|---|---|---|
| a | Kewilayahan | batas desa (GIS), aset peta | RT/RW/dusun master (**Fase 1**), batas antar-dusun/RW/RT, penggunaan lahan ❌ |
| b | Kependudukan | warga, impor, koreksi | KK, mutasi, wilayah (**Fase 1**) |
| c | Sosial budaya | ❌ | lembaga adat, tempat ibadah, kesenian: kolom/tabel kustom (Fase 2) |
| d | Potensi ekonomi | `Potential`, `VillagePotential` | ✅ dasar |
| e | Ekonomi desa & masyarakat | BUMDes, koperasi, UKM, pertanian | 🟡 (simpan-pinjam, pasar desa) |
| f | Pelayanan dasar & kesejahteraan | Posyandu | 🟡 (fasilitas pendidikan/kesehatan, KIA, imunisasi) |
| g | Perlindungan sosial & penerima bantuan | bansos (daftar NIK) | 🧱 alur usulan/verifikasi, DTSEN |
| h | Kebencanaan & mitigasi | `DisasterPoint` | 🧱 |
| i | Lingkungan hidup | bank sampah, insiden | 🧱 |
| j | Sumber daya alam | sebagian pertanian | ❌ |
| k | Inovasi & teknologi | website desa | 🟡 |
| l | Kolaborasi & kemitraan | ❌ | kolom/tabel kustom |
| m | Administrasi keuangan & aset | APBDes datar, transaksi, aset peta | 🟡 struktur Permendagri 20/2018, KIB |
| n | Administrasi pembangunan | RPJMDes/RKPDes/proyek | 🟡 progres, RAB |
| o | Pemerintahan & lembaga kemasyarakatan | perangkat, jabatan | BPD/LPM/lembaga ❌ |
| p | Partisipasi masyarakat | pengaduan, forum, feed, musdes | ✅/🟡 |
| q | Lainnya | ❌ | kolom/tabel kustom (Fase 2) |

**Ekspor:** adaptor baru `satu_idesa` pada `lib/integrations/` yang menghasilkan "Paket Data Desa" JSON berversi, satu kunci per kategori a–q, plus status kelengkapan per kategori (ini juga dasar dasbor "kesiapan Satu iDesa" untuk kades). **Spesifikasi API Satu iDesa belum ditemukan** (teks hanya mewajibkan API aman standar SPBE); format kita dirancang agar mudah dipetakan, dan harus dicocokkan begitu Kemendes merilis spesifikasinya. Tenggat penyesuaian desa ±4 Des 2026: yang realistis = pemetaan + ekspor kategori a/b/d/o/p, sisanya bertahap.

## 9. Pengujian

- Selesai: 19 tes logika murni (KK, wilayah, mutasi, laporan), termasuk data berantakan (KK tanpa kepala, dua kepala, kepala meninggal, RT "01" vs "1", NIK tidak cocok tanggal lahir/jenis kelamin).
- Tahap C–D: tes terhadap MySQL sementara (backfill pada salinan data pilot, idempotensi dijalankan dua kali, rekonsiliasi memperbaiki penyimpangan buatan, hapus warga menulis arsip, mutasi menerapkan atomik). Daemon Docker belum menyala di mesin ini; perlu dinyalakan atau MySQL lokal dipasang.
- Tes statis yang ada (guard + audit) otomatis mencakup rute baru.

## 10. Risiko

| Risiko | Mitigasi |
|---|---|
| Data pilot sangat berantakan | backfill dry-run + laporan anomali dulu; tidak ada penolakan paksa |
| Dua sumber kebenaran menyimpang | rekonsiliasi terjadwal + laporan penyimpangan; kolom lama tetap otoritas |
| Beban `ALTER TABLE residents` pada tabel besar | hanya 3 kolom NULL + indeks; jalankan di luar jam sibuk; ukuran tabel per desa kecil |
| Snapshot arsip memuat NIK | masa simpan + pembersihan terjadwal; akses terbatas admin; tercakup UU PDP (DPIA) |
| UX operator awam | satu langkah per aksi, istilah sehari-hari, uji pada Karanganyar sebelum dibuka |

## 11. Keputusan yang dibutuhkan dari pemilik

1. **Masa simpan arsip warga terhapus** (usulan 12 bulan).
2. **Cara menerapkan SQL aditif ke produksi** (SQL manual saat jendela rilis, atau lewat prosedur `db push` yang sudah ada). Rekomendasi: SQL manual, karena `migrate deploy` tidak aman di DB ini.
3. **Persetujuan menyalakan tahap C–D untuk Karanganyar** setelah dry-run (anomali dibaca bersama operator desa).

## 12. Status implementasi tahap C–D (2026-10-31)

Semua di balik bendera `Village.settings.kependudukanV2` (default mati = perilaku lama persis).

| Bagian | Berkas | Teruji |
|---|---|---|
| Mesin sinkron (rekonsiliasi desa, sinkron per-KK, arsip hapus, mutasi `legacy_edit`/`import`, pembungkus tahan-gagal) | `lib/kependudukan/sync.ts` | `tests/kependudukan-sync.integration.test.ts` (12 tes, MySQL nyata: idempoten, varian 01/1 digabung, kolom lama tak berubah, desa lain tak tersentuh) |
| Titik tulis | `residents` POST, `[id]` PUT/PATCH/DELETE, `bulk` | bendera mati = tidak ada yang berubah |
| Backfill desa | `scripts/kependudukan-backfill.ts` (default uji coba; `--apply`; `--enable`) | pada salinan Bedahan: 830 KK, 129 unit wilayah, 1,8 dtk, jalan kedua 0 perubahan |
| Alur mutasi (ajukan, putuskan atomik, batal) | `lib/kependudukan/mutation-service.ts` | `tests/kependudukan-mutation.integration.test.ts` (10 tes: NIK tak tersimpan, rollback saat validasi gagal, persetujuan serentak hanya satu lolos, lintas desa 404) |
| API | `/api/kependudukan/{status,mutasi,mutasi/keputusan,mutasi/[id],households,households/[id],wilayah,laporan/mutasi}` | tes guard + audit statis |
| Izin | matriks `residents`: tambah aksi `approve` (admin, sekretaris, kepala desa); `/mutasi/keputusan` → `approve` | tes guard |
| Layar | `/data-warga/mutasi`, `/data-warga/keluarga` (tab Keluarga, Wilayah), pintu masuk di Data Warga | tsc + lint; **belum dicoba di browser** |

Keputusan implementasi: NIK warga baru tidak disimpan di `details` mutasi (diisi ulang saat persetujuan); keputusan memakai klaim `PENDING → APPLIED` dalam satu transaksi (rollback bila validasi gagal); sinkron yang gagal tidak menggagalkan penulisan warga, desa ditandai `kependudukanV2NeedsReconcile`.

Belum: ganti kepala dari layar Keluarga (sementara lewat Perbaikan Data KK), editor wilayah (gabung/rename unit), mengaktifkan kembali akun mobile warga yang datang kembali, adaptor ekspor `satu_idesa`, pembersihan terjadwal `resident_archives` (usulan 12 bulan), rekonsiliasi terjadwal.

**Tanpa skrip untuk operator (2026-10-31):** admin desa mengaktifkan fitur dengan satu tombol di Data Warga (`POST /api/kependudukan/aktivasi`: bentuk struktur → nyalakan bendera → kejar perubahan, aman diulang). Pemulihan mandiri: sinkronisasi gagal menandai desa; tanda dibersihkan otomatis oleh perubahan data warga berikutnya atau kunjungan halaman Data Warga (`healIfNeeded`). Jaring pengaman opsional: `POST /api/cron/kependudukan-reconcile` harian. `scripts/kependudukan-backfill.ts` tinggal alat darurat/uji coba untuk teknisi.
