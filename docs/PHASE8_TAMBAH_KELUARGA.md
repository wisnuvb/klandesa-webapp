# Paket 8: wizard "Tambah Keluarga" (satu KK, banyak anggota)

Tanggal: 2026-11-02. Status: **dikode dan teruji lokal (unit, render, dan MySQL sementara); tanpa perubahan skema; belum di-commit/deploy; belum dicoba di peramban.**
Asal: masukan perangkat desa ("input warga sekaligus anggota keluarga"). OCR foto KK/KTP ditunda (keputusan pemilik).

## Alur

Halaman `/data-warga/keluarga/tambah` (tombol "Tambah Keluarga" di Data Warga), tiga langkah dengan indikator langkah, fokus berpindah ke judul langkah, dan ringkasan galat yang bisa diklik ke kolomnya:

1. **Keluarga**: No. KK (16 digit), alamat, RT/RW/dusun, dan jenis pencatatan: warga lama (data awal) atau keluarga baru datang (tanggal datang, status kependudukan tetap/tidak tetap, alamat asal). KK sah 16 digit langsung dicek: bila sudah terdaftar, tampil pemberitahuan dan alamat terisi dari KK itu (anggota baru ditambahkan ke KK tersebut, mis. bayi atau menantu).
2. **Anggota**: kartu per anggota (hubungan, nama, NIK, jenis kelamin, tempat/tanggal lahir, agama, status perkawinan). Mengisi NIK 16 digit mengisi jenis kelamin dan tanggal lahir yang masih kosong. "Data tambahan" (tertutup bawaan, terbuka sendiri bila ada galat di dalamnya): pendidikan, pekerjaan, golongan darah, WNI/WNA, suku, status KTP-el, ayah/ibu, no. akta, dan "Dicatat sebagai" (Data awal, Kelahiran baru, atau Datang). Anggota baru mewarisi agama, kewarganegaraan, dan suku anggota pertama; hubungan bawaan: pasangan lalu Anak.
3. **Periksa dan simpan**: ringkasan keluarga dan tabel anggota (NIK disamarkan ••••1234), daftar masalah (memblokir, ada tombol Perbaiki) dan peringatan (wajib dicentang "sudah diperiksa" bila ada), data orang tua anak yang terisi otomatis.

## Aturan (lib/kependudukan/family.ts, murni, dipakai klien dan server)

- Memblokir: KK 16 digit, alamat, minimal satu anggota (maks 25), nama/NIK 16 digit/jenis kelamin/tempat lahir/tanggal lahir sah dan tidak di masa depan/agama/status perkawinan/hubungan, NIK ganda dalam keluarga, KK baru wajib tepat satu Kepala Keluarga, KK yang sudah punya kepala tidak boleh menerima kepala lagi, kejadian "Datang" butuh data kedatangan, dan NIK yang sudah dipakai warga lain di desa ini.
- Peringatan: tanggal lahir/jenis kelamin berbeda dengan yang tersirat NIK, Suami perempuan/Istri laki-laki, pasangan berstatus Belum Menikah, anak terpaut kurang dari 12 tahun dari kepala, kepala di bawah 17 tahun, "Kelahiran baru" untuk yang lahir lebih dari setahun lalu, lahir <30 hari tetapi tidak dicatat sebagai kelahiran.
- Ayah/ibu anak diturunkan dari peran (ayah = Suami atau kepala laki-laki; ibu = Istri atau kepala perempuan) hanya bila kolomnya kosong; isian operator tidak ditimpa.

## Server

- `POST /api/residents/keluarga/periksa` (tanpa menulis; izin buat warga; tanpa audit karena baca-saja, tercatat di pengecualian `api-guard-coverage`) dan `POST /api/residents/keluarga` (simpan). Keduanya melewati `requireVillageApiContext`, langganan aktif, dan izin `residents:create`.
- Penyimpanan **atomik** dalam satu transaksi (`lib/kependudukan/family-service.ts`): semua anggota atau tidak ada. NIK yang direbut permintaan lain di sela waktu (P2002) menghasilkan 409 dengan pesan yang menunjuk anggota yang tepat; teruji dengan dua permintaan serentak.
- Bila `kependudukanV2` aktif: anggota bertanda Kelahiran/Datang menghasilkan catatan `ResidentMutation` berstatus APPLIED (sumber `web`, tanpa NIK lengkap) di transaksi yang sama, dasar kategori Lahir/Datang laporan LAMPID; rumah tangga disinkron (`syncResidents`). Bila mati: warga tersimpan saja.
- Audit hanya memuat 4 digit akhir KK dan jumlah (tanpa NIK, nama, alamat). Webhook `penduduk.dibuat` per anggota.

## Berkas

`lib/kependudukan/{family,family-service}.ts`; `app/api/residents/keluarga/{route,periksa/route}.ts`; `app/(app)/data-warga/keluarga/tambah/` (halaman, `TambahKeluargaView`, `StepKeluarga`, `MemberCard`, `StepPeriksa`, `fields`); `EthnicitySelect` diekstrak dari `EthnicityField` agar dipakai ulang. Tes: `tests/family.test.ts` (aturan), `tests/family-render.test.tsx` (a11y/render, NIK tak bocor), `tests/family.integration.test.ts` (9 tes MySQL: semua-atau-tidak, KK yang ada, kepala ganda, datang/lahir, desa tanpa v2, isolasi desa, balapan).

## Belum dikerjakan (sengaja)

- OCR/unggah foto KK untuk mengisi form (ditunda).
- Lampiran scan KK pada rumah tangga (rumah tangga hanya ada saat v2 aktif); lampiran tersedia per mutasi.
- Draf tersimpan antar sesi (hanya peringatan sebelum meninggalkan halaman).
- Anggota yang sudah ada di KK tidak ikut diubah/dipindahkan dari wizard.
- Uji di peramban: belum.
