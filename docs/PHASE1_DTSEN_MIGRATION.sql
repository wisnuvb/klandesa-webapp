-- Fase 1 butir 5 (DTSEN): hanya MENAMBAH satu tabel baru.
CREATE TABLE `dtsen_proposals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `residentId` INTEGER NULL,
    `residentName` VARCHAR(255) NOT NULL,
    `residentRt` VARCHAR(10) NULL,
    `residentRw` VARCHAR(10) NULL,
    `kind` VARCHAR(10) NOT NULL,
    `source` VARCHAR(10) NOT NULL,
    `reason` VARCHAR(1000) NOT NULL,
    `knownDesil` VARCHAR(20) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'DIAJUKAN',
    `statusChangedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `verifiedAt` DATE NULL,
    `verifiedBy` VARCHAR(150) NULL,
    `verificationNote` VARCHAR(1000) NULL,
    `musdesAt` DATE NULL,
    `musdesRef` VARCHAR(150) NULL,
    `forwardedAt` DATE NULL,
    `forwardedRef` VARCHAR(150) NULL,
    `outcome` VARCHAR(10) NULL,
    `outcomeAt` DATE NULL,
    `outcomeNote` VARCHAR(500) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `dtsen_proposals_villageId_status_statusChangedAt_idx`(`villageId`, `status`, `statusChangedAt`),
    INDEX `dtsen_proposals_villageId_residentId_idx`(`villageId`, `residentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `dtsen_proposals` ADD CONSTRAINT `dtsen_proposals_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `dtsen_proposals` ADD CONSTRAINT `dtsen_proposals_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `residents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
