-- Rollback tautan SPP: hanya kolom/indeks tautan yang hilang; SPP dan data pembayaran tidak tersentuh.
ALTER TABLE `blt_payments` DROP FOREIGN KEY `blt_payments_sppId_fkey`;
ALTER TABLE `pktd_work_days` DROP FOREIGN KEY `pktd_work_days_sppId_fkey`;
ALTER TABLE `kdmp_installments` DROP FOREIGN KEY `kdmp_installments_sppId_fkey`;
DROP INDEX `blt_payments_sppId_idx` ON `blt_payments`;
DROP INDEX `pktd_work_days_sppId_idx` ON `pktd_work_days`;
DROP INDEX `kdmp_installments_sppId_idx` ON `kdmp_installments`;
DROP INDEX `apbdes_pay_requests_villageId_sourceKind_sourceId_idx` ON `apbdes_pay_requests`;
ALTER TABLE `blt_payments` DROP COLUMN `sppId`;
ALTER TABLE `pktd_work_days` DROP COLUMN `sppId`;
ALTER TABLE `kdmp_installments` DROP COLUMN `sppId`;
ALTER TABLE `apbdes_pay_requests` DROP COLUMN `sourceId`, DROP COLUMN `sourceKind`;
