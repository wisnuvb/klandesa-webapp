-- Paket 2 / tautan pembayaran ke Buku Kas Umum. ADITIF: 3 kolom bkuEntryId (NULL) + indeks + FK ON DELETE SET NULL. Rollback: PHASE2_BKU_LINK_ROLLBACK.sql (tautan hilang, catatan BKU tetap).

-- AlterTable
ALTER TABLE `blt_payments` ADD COLUMN `bkuEntryId` INTEGER NULL;
-- AlterTable
ALTER TABLE `kdmp_installments` ADD COLUMN `bkuEntryId` INTEGER NULL;
-- AlterTable
ALTER TABLE `pktd_work_days` ADD COLUMN `bkuEntryId` INTEGER NULL;
-- CreateIndex
CREATE INDEX `blt_payments_bkuEntryId_idx` ON `blt_payments`(`bkuEntryId`);
-- CreateIndex
CREATE INDEX `kdmp_installments_bkuEntryId_idx` ON `kdmp_installments`(`bkuEntryId`);
-- CreateIndex
CREATE INDEX `pktd_work_days_bkuEntryId_idx` ON `pktd_work_days`(`bkuEntryId`);
-- AddForeignKey
ALTER TABLE `blt_payments` ADD CONSTRAINT `blt_payments_bkuEntryId_fkey` FOREIGN KEY (`bkuEntryId`) REFERENCES `apbdes_entries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `pktd_work_days` ADD CONSTRAINT `pktd_work_days_bkuEntryId_fkey` FOREIGN KEY (`bkuEntryId`) REFERENCES `apbdes_entries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `kdmp_installments` ADD CONSTRAINT `kdmp_installments_bkuEntryId_fkey` FOREIGN KEY (`bkuEntryId`) REFERENCES `apbdes_entries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
