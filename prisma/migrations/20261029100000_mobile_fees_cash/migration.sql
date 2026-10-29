-- CreateTable
CREATE TABLE `fee_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `scope` VARCHAR(10) NOT NULL,
    `rt` VARCHAR(10) NULL,
    `rw` VARCHAR(10) NULL,
    `name` VARCHAR(80) NOT NULL,
    `category` VARCHAR(20) NOT NULL,
    `amount` INTEGER NOT NULL,
    `recurrence` VARCHAR(10) NOT NULL,
    `startPeriod` VARCHAR(7) NOT NULL,
    `endPeriod` VARCHAR(7) NULL,
    `dueDay` INTEGER NOT NULL DEFAULT 10,
    `payInfo` VARCHAR(500) NULL,
    `payQrUrl` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdByType` VARCHAR(10) NOT NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `fee_schedules_villageId_scope_rt_rw_isActive_idx`(`villageId`, `scope`, `rt`, `rw`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fee_charges` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `scheduleId` INTEGER NOT NULL,
    `kk` VARCHAR(16) NOT NULL,
    `headResidentId` INTEGER NULL,
    `headName` VARCHAR(255) NOT NULL,
    `period` VARCHAR(7) NOT NULL,
    `amount` INTEGER NOT NULL,
    `waivedAt` DATETIME(3) NULL,
    `waivedReason` VARCHAR(300) NULL,
    `lastRemindedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `fee_charges_villageId_period_idx`(`villageId`, `period`),
    INDEX `fee_charges_villageId_kk_idx`(`villageId`, `kk`),
    UNIQUE INDEX `fee_charges_scheduleId_kk_period_key`(`scheduleId`, `kk`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fee_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `chargeId` INTEGER NOT NULL,
    `amount` INTEGER NOT NULL,
    `method` VARCHAR(10) NOT NULL,
    `proofUrl` TEXT NULL,
    `note` VARCHAR(300) NULL,
    `status` VARCHAR(10) NOT NULL,
    `source` VARCHAR(10) NOT NULL,
    `paidAt` DATETIME(3) NOT NULL,
    `recordedByType` VARCHAR(10) NOT NULL,
    `recordedById` INTEGER NOT NULL,
    `decidedAt` DATETIME(3) NULL,
    `decisionNote` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fee_payments_chargeId_status_idx`(`chargeId`, `status`),
    INDEX `fee_payments_villageId_status_createdAt_idx`(`villageId`, `status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cash_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `scope` VARCHAR(10) NOT NULL,
    `rt` VARCHAR(10) NULL,
    `rw` VARCHAR(10) NULL,
    `type` VARCHAR(3) NOT NULL,
    `amount` INTEGER NOT NULL,
    `category` VARCHAR(30) NOT NULL,
    `description` VARCHAR(200) NOT NULL,
    `entryDate` DATE NOT NULL,
    `receiptUrl` TEXT NULL,
    `recordedByType` VARCHAR(10) NOT NULL,
    `recordedById` INTEGER NOT NULL,
    `voidedAt` DATETIME(3) NULL,
    `voidReason` VARCHAR(200) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cash_entries_villageId_scope_rt_rw_entryDate_idx`(`villageId`, `scope`, `rt`, `rw`, `entryDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

