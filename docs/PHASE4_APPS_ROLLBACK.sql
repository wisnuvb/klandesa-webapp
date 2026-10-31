-- Rollback Fase 4: hanya menghapus dua tabel baru (tabel kustom yang sudah tercipta dari templat TIDAK ikut terhapus).
DROP TABLE `app_installs`;
DROP TABLE `app_templates`;
