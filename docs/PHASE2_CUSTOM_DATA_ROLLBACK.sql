-- Rollback data kustom: hanya menghapus tiga tabel baru (urutan: anak dulu). Tidak ada tabel lama yang disentuh.
DROP TABLE `custom_records`;
DROP TABLE `custom_fields`;
DROP TABLE `custom_tables`;
