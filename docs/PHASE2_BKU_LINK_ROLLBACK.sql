-- Rollback tautan BKU: hanya kolom tautan yang hilang; catatan Buku Kas Umum dan data pembayaran tidak tersentuh.
ALTER TABLE `blt_payments` DROP FOREIGN KEY `blt_payments_bkuEntryId_fkey`;
ALTER TABLE `pktd_work_days` DROP FOREIGN KEY `pktd_work_days_bkuEntryId_fkey`;
ALTER TABLE `kdmp_installments` DROP FOREIGN KEY `kdmp_installments_bkuEntryId_fkey`;
DROP INDEX `blt_payments_bkuEntryId_idx` ON `blt_payments`;
DROP INDEX `pktd_work_days_bkuEntryId_idx` ON `pktd_work_days`;
DROP INDEX `kdmp_installments_bkuEntryId_idx` ON `kdmp_installments`;
ALTER TABLE `blt_payments` DROP COLUMN `bkuEntryId`;
ALTER TABLE `pktd_work_days` DROP COLUMN `bkuEntryId`;
ALTER TABLE `kdmp_installments` DROP COLUMN `bkuEntryId`;
