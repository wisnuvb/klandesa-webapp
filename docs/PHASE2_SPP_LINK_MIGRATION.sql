-- Paket 2 / pembayaran modul dibiayai SPP. ADITIF: 2 kolom pada apbdes_pay_requests + kolom sppId (NULL) pada 3 tabel pembayaran, indeks, FK ON DELETE SET NULL. HARUS setelah PHASE2_BLT/PKTD/KDMP. Rollback: PHASE2_SPP_LINK_ROLLBACK.sql (tautan hilang, SPP dan pembayaran tetap).

-- AlterTable
ALTER TABLE `apbdes_pay_requests` ADD COLUMN `sourceId` INTEGER NULL,
    ADD COLUMN `sourceKind` VARCHAR(6) NULL;
-- AlterTable
ALTER TABLE `blt_payments` ADD COLUMN `sppId` INTEGER NULL;
-- AlterTable
ALTER TABLE `kdmp_installments` ADD COLUMN `sppId` INTEGER NULL;
-- AlterTable
ALTER TABLE `pktd_work_days` ADD COLUMN `sppId` INTEGER NULL;
-- CreateIndex
CREATE INDEX `apbdes_pay_requests_villageId_sourceKind_sourceId_idx` ON `apbdes_pay_requests`(`villageId`, `sourceKind`, `sourceId`);
-- CreateIndex
CREATE INDEX `blt_payments_sppId_idx` ON `blt_payments`(`sppId`);
-- CreateIndex
CREATE INDEX `kdmp_installments_sppId_idx` ON `kdmp_installments`(`sppId`);
-- CreateIndex
CREATE INDEX `pktd_work_days_sppId_idx` ON `pktd_work_days`(`sppId`);
-- AddForeignKey
ALTER TABLE `blt_payments` ADD CONSTRAINT `blt_payments_sppId_fkey` FOREIGN KEY (`sppId`) REFERENCES `apbdes_pay_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `pktd_work_days` ADD CONSTRAINT `pktd_work_days_sppId_fkey` FOREIGN KEY (`sppId`) REFERENCES `apbdes_pay_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE `kdmp_installments` ADD CONSTRAINT `kdmp_installments_sppId_fkey` FOREIGN KEY (`sppId`) REFERENCES `apbdes_pay_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
