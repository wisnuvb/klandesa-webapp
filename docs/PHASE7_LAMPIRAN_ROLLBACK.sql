-- Rollback PHASE7_LAMPIRAN_MIGRATION.sql. Menghapus tautan lampiran (berkas di Arsip Digital TIDAK ikut terhapus).
-- Jalankan hanya bila kode yang memakai tabel ini sudah ditarik.

DROP TABLE `record_attachments`;
