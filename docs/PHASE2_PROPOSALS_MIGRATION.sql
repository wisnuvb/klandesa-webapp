-- Fase 2 usulan (maker-checker): hanya MENAMBAH satu tabel baru.
-- CreateTable
CREATE TABLE `change_proposals` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `source` VARCHAR(12) NOT NULL,
    `apiKeyId` INTEGER NULL,
    `keyPrefix` VARCHAR(16) NULL,
    `keyName` VARCHAR(100) NULL,
    `entity` VARCHAR(20) NOT NULL,
    `operation` VARCHAR(10) NOT NULL,
    `tableId` INTEGER NOT NULL,
    `targetRecordId` BIGINT NULL,
    `payload` JSON NOT NULL,
    `note` VARCHAR(300) NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'PENDING',
    `decidedById` INTEGER NULL,
    `decidedAt` DATETIME(3) NULL,
    `rejectionReason` VARCHAR(300) NULL,
    `appliedRecordId` BIGINT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `change_proposals_villageId_status_createdAt_idx`(`villageId`, `status`, `createdAt` DESC),
    INDEX `change_proposals_apiKeyId_createdAt_idx`(`apiKeyId`, `createdAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `change_proposals` ADD CONSTRAINT `change_proposals_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
