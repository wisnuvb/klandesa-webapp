-- Rollback Fase 2 kunci API: hanya menghapus dua tabel baru (tidak ada tabel lama yang disentuh).
DROP TABLE `api_access_logs`;
DROP TABLE `api_keys`;
