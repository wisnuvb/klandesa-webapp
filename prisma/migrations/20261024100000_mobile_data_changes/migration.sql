-- CreateTable
CREATE TABLE `data_change_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `residentId` INTEGER NOT NULL,
    `requestedByResidentId` INTEGER NOT NULL,
    `field` VARCHAR(30) NOT NULL,
    `oldValue` TEXT NULL,
    `newValue` TEXT NOT NULL,
    `note` VARCHAR(300) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `reviewedById` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNote` VARCHAR(300) NULL,
    `appliedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `data_change_requests_villageId_status_createdAt_idx`(`villageId`, `status`, `createdAt`),
    INDEX `data_change_requests_requestedByResidentId_createdAt_idx`(`requestedByResidentId`, `createdAt`),
    INDEX `data_change_requests_residentId_field_status_idx`(`residentId`, `field`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
