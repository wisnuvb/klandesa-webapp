-- Membatalkan PHASE3_BUMDES_MIGRATION.sql. Seluruh jurnal, riwayat koreksi, penutupan periode, legalitas, pengurus, dan catatan arus APB Desa
-- BUMDes dibuang. Transaksi kas, unit, aset, dan catatan Buku Kas Umum APB Desa TIDAK tersentuh (catatan BKU yang sudah dibuat arus tetap ada).
DROP TABLE IF EXISTS `bumdes_village_flows`;
DROP TABLE IF EXISTS `bumdes_musdes_resolutions`;
DROP TABLE IF EXISTS `bumdes_officers`;
DROP TABLE IF EXISTS `bumdes_legal_profiles`;
DROP TABLE IF EXISTS `bumdes_period_logs`;
DROP TABLE IF EXISTS `bumdes_period_closes`;
DROP TABLE IF EXISTS `bumdes_journal_lines`;
DROP TABLE IF EXISTS `bumdes_journals`;
DROP TABLE IF EXISTS `bumdes_transaction_revisions`;
ALTER TABLE `bumdes_transactions` DROP CHECK `bumdes_transactions_void_chk`;
ALTER TABLE `bumdes_transactions` DROP CHECK `bumdes_transactions_status_chk`;
DROP INDEX `bumdes_transactions_bumdesId_status_idx` ON `bumdes_transactions`;
ALTER TABLE `bumdes_transactions` DROP COLUMN `accountCode`, DROP COLUMN `cashAccountCode`, DROP COLUMN `revision`, DROP COLUMN `status`, DROP COLUMN `voidReason`, DROP COLUMN `voidedAt`, DROP COLUMN `voidedById`;
