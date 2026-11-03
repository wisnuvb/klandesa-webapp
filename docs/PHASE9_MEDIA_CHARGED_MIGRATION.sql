-- Paket 9 / foto seluler dihitung ke kuota Arsip Digital. ADITIF: 1 kolom baru (default 0).
-- Setelah SQL ini jalankan sekali: npx tsx scripts/reconcile-mobile-media.ts  (mengisi chargedBytes dari isi bucket).
-- Rollback: PHASE9_MEDIA_CHARGED_ROLLBACK.sql.

ALTER TABLE `village_media_usage` ADD COLUMN `chargedBytes` BIGINT NOT NULL DEFAULT 0;
