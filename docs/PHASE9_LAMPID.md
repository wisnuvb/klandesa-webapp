# Paket 9: laporan bulanan LAMPID (Lahir, Mati, Pindah, Datang)

Tanggal: 2026-11-02. Status: **dikode dan teruji lokal; tanpa skema baru (tidak ada SQL); belum di-commit/deploy; belum dicoba di peramban.**
Asal: masukan perangkat desa. Keputusan pemilik: 4 kategori saja, format generik namun menarik (bukan formulir kecamatan tertentu).

## Halaman
- `/data-warga/lampid` — pilih bulan/tahun (tombol bulan sebelum/sesudah), kelompok per dusun atau per RW/RT; 6 kartu (Penduduk awal, +Lahir, −Mati, −Pindah, +Datang, Penduduk akhir; tiap kartu menampilkan L/P dan WNA bila ada); tabel rincian per wilayah; tabel menurut jenis kelamin × kewarganegaraan; daftar nama per kategori; peringatan data.
- `/data-warga/lampid/cetak?month=&group=` — tampilan A4 dengan kop desa (logo, kabupaten, kecamatan, alamat), tabel, daftar nama, tanda tangan Kepala Desa dan Sekretaris Desa (nama diambil dari Perangkat Desa yang aktif; kosong bila tidak ditemukan).
- Unduh: Excel (7 sheet: Ringkasan, Per Dusun/RW-RT, Rincian WNI-WNA, 4 daftar) dan CSV daftar kejadian (satu baris per kejadian). Dibuat di peramban dari data yang sudah termuat.
- Pintu masuk: tombol "Laporan LAMPID" di `KependudukanNav` (muncul juga bila Buku Mutasi belum diaktifkan).
- API: `GET /api/kependudukan/lampid?month=yyyy-mm&group=dusun|rtrw`. Izin = baca Data Warga (`/api/kependudukan` → `residents`). Bulan yang belum berjalan ditolak 400.

## Cara menghitung (`lib/kependudukan/lampid.ts`, murni)
Tidak bergantung pada bendera `kependudukanV2`: kejadian diambil dari dua sumber lalu digabung tanpa hitung ganda.

| Kategori | Dari Buku Mutasi (APPLIED) | Dari kolom data warga (mengisi yang belum tercatat) |
|---|---|---|
| Lahir | `BIRTH` | tanggal lahir, **kecuali** warga punya tanggal datang (berarti pendatang) |
| Mati | `DEATH` | tidak hidup + tanggal meninggal |
| Pindah | `MOVE_OUT` | hidup + tanggal pindah |
| Datang | `MOVE_IN` | tanggal datang |

- Penggabungan: untuk pasangan (warga, kategori) yang sudah ada di Buku Mutasi, Buku Mutasi menang (satu warga bisa pindah-datang berulang). `KK_CHANGE` dan mutasi PENDING/REJECTED/CANCELLED tidak dihitung; pindah antar-KK tidak mengubah jumlah desa.
- **Jumlah awal/akhir dihitung mundur** dari penduduk aktif sekarang (hidup dan belum pindah): akhir = sekarang − (masuk − keluar) sesudah bulan itu; awal = akhir − (lahir + datang − mati − pindah) pada bulan itu. Dihitung per kelompok (WNI/WNA × L/P/belum diisi) sehingga total dan rincian selalu cocok.
- Wilayah: wilayah warga **saat ini**; bila warganya sudah dihapus, cuplikan RT/RW pada baris mutasi (dusun kosong → "(Belum diisi)").
- Peringatan otomatis: angka awal/akhir negatif (data tidak konsisten), warga meninggal tanpa tanggal, dan berapa kejadian bulan itu yang hanya berasal dari tanggal pada data warga.

## Keterbatasan yang disengaja (perlu dipahami operator)
- Angka bulan lampau **berubah bila data warga dikoreksi sesudahnya** (tidak ada "kunci bulan"/snapshot). Cetak dan simpan PDF saat laporan dikirim. Menambah tabel snapshot adalah langkah lanjutan bila kecamatan menuntut angka yang tak berubah.
- Warga yang **dihapus permanen** sesudah bulan itu tidak ikut jumlah awal (kejadian dari Buku Mutasi tetap muncul); warga yang pindah RT/dusun dihitung di wilayah barunya untuk bulan lampau.
- Datang dari kolom hanya bila **tanggal datang terisi**. Warga pendatang lama tanpa tanggal datang dianggap sudah ada sejak dulu. Bayi pendatang tanpa tanggal datang tampil sebagai Lahir.
- Lahir mati (stillbirth) tidak ditangani khusus.
- Jumlah awal sebelum fitur/ data tanggal dipakai hanyalah perkiraan dari data yang ada.

## Perubahan kecil di jalur lain
- `mutation-service.ts`: mutasi Datang untuk warga baru kini mengisi `arrivalDate` (= tanggal kejadian) dan `originAddress` (= asal), supaya warga tersebut dikenali sebagai pendatang oleh laporan. Diuji di `kependudukan-mutation.integration.test.ts`.

## Privasi
Daftar nama hanya menampilkan nama dan 4 digit terakhir NIK (tes memastikan tidak ada 16 digit di JSON laporan maupun CSV). CSV memakai `toCsv` yang menetralkan awalan rumus (`=`, `+`, `-`, `@`).

## Tes
`tests/kependudukan-lampid.test.ts` (21: rentang bulan, kejadian, penggabungan, hitung mundur, wilayah, WNI/WNA, ekspor), `…-render.test.tsx` (3), `…integration.test.ts` (6, MySQL sementara: dedupe mutasi vs kolom, mutasi PENDING/KK_CHANGE diabaikan, warga terhapus, isolasi antar-desa).
