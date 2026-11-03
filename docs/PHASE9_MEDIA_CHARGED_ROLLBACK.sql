-- Rollback PHASE9_MEDIA_CHARGED_MIGRATION.sql. Jalankan hanya bila kode yang memakai kolom ini sudah ditarik.

ALTER TABLE `village_media_usage` DROP COLUMN `chargedBytes`;
