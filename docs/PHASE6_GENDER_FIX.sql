-- Perbaikan data jenis kelamin warga (OPSIONAL, belum dijalankan di mana pun).
-- Latar: sebelum 2026-11-02, form Tambah/Ubah Warga mengirim "M"/"F" dan API menyimpannya apa adanya, padahal seluruh
-- aplikasi (statistik, filter, surat, tampilan) membaca "Laki-laki"/"Perempuan". Kodenya sudah diperbaiki (API menormalkan);
-- baris lama yang terlanjur "M"/"F" perlu dikoreksi sekali.

-- 1) Periksa dulu. Hanya jalankan koreksi bila ada nilai selain "Laki-laki"/"Perempuan".
SELECT villageId, gender, COUNT(*) AS jumlah FROM residents WHERE gender NOT IN ('Laki-laki', 'Perempuan') GROUP BY villageId, gender;

-- 2) Koreksi (cadangkan tabel `residents` sebelum menjalankan).
UPDATE residents SET gender = 'Laki-laki' WHERE gender IN ('M', 'm', 'L', 'l');
UPDATE residents SET gender = 'Perempuan' WHERE gender IN ('F', 'f', 'P', 'p');

-- 3) Pastikan bersih (hasil harus kosong).
SELECT villageId, gender, COUNT(*) AS jumlah FROM residents WHERE gender NOT IN ('Laki-laki', 'Perempuan') GROUP BY villageId, gender;
