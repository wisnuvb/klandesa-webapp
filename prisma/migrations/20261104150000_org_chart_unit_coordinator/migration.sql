-- Bagan hirarki perangkat desa: unit organisasi per jabatan dan koordinator per perangkat.
-- Aditif dan aman diulang berurutan: kolom baru boleh NULL, data lama tidak berubah.

-- AlterTable
ALTER TABLE `positions` ADD COLUMN `unit` VARCHAR(20) NULL;

-- AlterTable
ALTER TABLE `officials` ADD COLUMN `coordinatorId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `officials_villageId_coordinatorId_idx` ON `officials`(`villageId`, `coordinatorId`);

-- AddForeignKey
ALTER TABLE `officials` ADD CONSTRAINT `officials_coordinatorId_fkey` FOREIGN KEY (`coordinatorId`) REFERENCES `officials`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
