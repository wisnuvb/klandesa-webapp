-- Rollback `20261105090000_lane_session_version`. Jalankan HANYA bila kode versi ini sudah di-rollback lebih dulu.
ALTER TABLE `platform_users` DROP COLUMN `sessionVersion`;
ALTER TABLE `regional_users` DROP COLUMN `sessionVersion`;
ALTER TABLE `partners` DROP COLUMN `sessionVersion`;
