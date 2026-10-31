# Fase 4: Aplikasi Desa (deklaratif) + galeri

Status: kode + tes selesai 2026-11-01, belum di-commit/di-deploy. SQL produksi tertunda: `docs/PHASE4_APPS_MIGRATION.sql` (hanya `CREATE TABLE`; rollback `PHASE4_APPS_ROLLBACK.sql`, tabel kustom yang sudah tercipta dari templat tidak ikut terhapus).

## Keputusan desain
Sesuai strategi: **manifes + konfigurasi dirender host**, tanpa runtime kode. Alasannya satu: yang bisa dilakukan sebuah manifes hanyalah *membuat tabel kustom* dan *menampilkan angka dari tabel itu sendiri*. Tidak ada kode, URL, HTML, skrip, atau akses data yang dibawa templat, jadi aman dibagikan antar desa. Runtime kode terisolasi (iframe/worker) **sengaja tidak dibangun**: belum ada permintaan nyata dan jalur tinjau baru berjalan.

## Manifes v1 (`lib/village-apps/manifest.ts`)
`{ schemaVersion: 1, tables: [1–5], dashboard: [0–8 widget] }`.
- Tabel: `ref`, `name`, `description`, `linkResident`, `fields[]` (tipe dan batas yang sama dengan Data Kustom). **Setiap kolom wajib menyatakan `piiClass`** (tidak ada bawaan "bukan pribadi").
- Widget: `count`, `recent` (1–4 kolom, 1–10 baris), `breakdown` (kolom pilihan/Ya-Tidak), `sum` (kolom angka).
- Kunci tak dikenal di tingkat mana pun ditolak (termasuk `__proto__`); batas ukuran 64 KB; widget hanya boleh merujuk tabel/kolom di manifes itu.
- Manifes **divalidasi ulang setiap dibaca dari DB** (pemasangan dan galeri); yang rusak diperlakukan tidak ada.

## Alur
1. **Ajukan** (admin/sekretaris desa): pilih 1–5 tabel → sistem menyusun manifes dari *skema* tabel (tanpa baris data) + dasbor bawaan (jumlah + terbaru). Status `PENDING`, maks 10 menunggu per desa. Peringatan otomatis untuk kolom yang tampak pribadi tetapi ditandai bukan pribadi, dan teks panjang bukan-pribadi.
2. **Tinjau** (admin platform, `/admin/templat`): lihat tiap kolom + kelas datanya + peringatan; terbitkan (opsional lencana "Resmi") atau tolak (wajib beralasan). Versi tidak berubah setelah diajukan; perubahan = versi baru yang ditinjau ulang. Galeri menampilkan versi terbit tertinggi.
3. **Galeri** (`/data-kustom/galeri`): desa lain melihat ringkasan, pratinjau kolom + kelas data, lalu **memasang** (admin/sekretaris). Pemasangan = membuat tabel kosong lewat `createTable` yang sama dengan manual (batas 20 tabel dan validasi sama), dalam satu transaksi (gagal di tengah → semua batal). Tidak memberi kunci API, webhook, atau akses apa pun. Satu templat satu kali per desa.
4. **Dasbor** (`/data-kustom/aplikasi/[id]`): angka dihitung dari tabel desa itu sendiri. **Lepas** hanya menghapus pintasan; tabel dan data tetap ada. **Tarik** templat dari galeri tidak memengaruhi desa yang sudah memasang.
5. Penerbit dihapus → `publisherVillageId` jadi NULL; templat dan pemasangan desa lain tetap.

## Belum dibuat (jujur)
- **Templat resmi kabupaten** (penerbit kabupaten, bukan hanya "Resmi" dari platform): butuh peran akun regional untuk menerbitkan; saat ini hanya admin platform yang menerbitkan dan menandai resmi.
- **Program mitra bersertifikat** (sandbox, pelatihan, lencana): keputusan bisnis, bukan kode.
- Widget lanjutan (grafik waktu, filter), aksi (tombol yang mengubah data), layar/formulir kustom, pembaruan otomatis pemasangan ke versi baru (sekarang: pasang ulang manual), pencarian/kategori galeri.
- Runtime kode terisolasi.

## Hasil tinjauan keamanan (2026-11-01)
Tanpa celah kritis (tidak ada IDOR, kebocoran lintas desa, XSS, atau jalur mengubah manifes setelah ditinjau). Diperbaiki: admin platform kini bisa **mencabut templat terbit** (wajib beralasan, pemasangan lama tetap) dan mengatur lencana "Resmi"; layar tinjauan menampilkan **semua** teks yang dibagikan (keterangan tabel, pilihan, satuan, judul widget); heuristik data pribadi tahan variasi tulisan ("Handphone", "N I K", "E-mail", "Domisili", "Nama…") dan menandai kolom teks bukan-pribadi pada tabel terhubung warga; peringatan otomatis juga terlihat oleh pemasang; catatan peninjau pada templat terbit hanya terlihat penerbit; **jumlah pemasang** dihitung dari desa unik (tidak bisa digelembungkan dengan pasang-lepas); pengajuan identik yang menunggu ditolak dan dibatasi 20/hari; pemasangan paralel menghasilkan 409 (bukan 500); audit mencatat id tervalidasi.
**Diterima/dicatat:** batas pengajuan menunggu (10) tidak atomik terhadap permintaan paralel; batas 20 tabel per desa tidak atomik (juga pada pembuatan tabel manual); widget `breakdown`/`sum` memindai hingga 20.000 baris, saat ini tidak terjangkau lewat API (hanya widget `count`/`recent` yang dihasilkan, tidak ada jalur impor manifes dari klien) tetapi **harus diagregasi di SQL sebelum ada templat resmi/impor manifes**; nama penerbit mengikuti nama desa (peninjau wajib mencocokkannya).
