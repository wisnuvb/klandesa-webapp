-- Fase 1 butir 3 (Keuangan Desa, Permendagri 20/2018): hanya MENAMBAH lima tabel baru. Tidak menyentuh tabel keuangan lama.
CREATE TABLE `apbdes_years` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `bankName` VARCHAR(100) NULL,
    `bankBranch` VARCHAR(100) NULL,
    `bankAccountNo` VARCHAR(50) NULL,
    `villageHeadName` VARCHAR(150) NULL,
    `secretaryName` VARCHAR(150) NULL,
    `treasurerName` VARCHAR(150) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `apbdes_years_villageId_year_key`(`villageId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `apbdes_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(12) NOT NULL DEFAULT 'DRAFT',
    `regulationNumber` VARCHAR(100) NULL,
    `regulationDate` DATE NULL,
    `exceptionalReason` VARCHAR(500) NULL,
    `notes` VARCHAR(1000) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `apbdes_documents_villageId_year_version_key`(`villageId`, `year`, `version`),
    INDEX `apbdes_documents_villageId_year_status_idx`(`villageId`, `year`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `apbdes_lines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `documentId` INTEGER NOT NULL,
    `villageId` INTEGER NOT NULL,
    `activityCode` VARCHAR(12) NULL,
    `accountCode` VARCHAR(14) NOT NULL,
    `description` VARCHAR(300) NOT NULL,
    `amountCents` BIGINT NOT NULL,
    `fundSource` VARCHAR(8) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `apbdes_lines_documentId_accountCode_idx`(`documentId`, `accountCode`),
    INDEX `apbdes_lines_villageId_idx`(`villageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `apbdes_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `entryDate` DATE NOT NULL,
    `voucherNo` VARCHAR(60) NOT NULL,
    `type` VARCHAR(16) NOT NULL,
    `channel` VARCHAR(5) NOT NULL,
    `activityCode` VARCHAR(12) NULL,
    `accountCode` VARCHAR(14) NULL,
    `description` VARCHAR(300) NOT NULL,
    `amountCents` BIGINT NOT NULL,
    `taxCents` BIGINT NOT NULL DEFAULT 0,
    `taxKind` VARCHAR(30) NULL,
    `bankFee` BOOLEAN NOT NULL DEFAULT false,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `apbdes_entries_villageId_year_entryDate_id_idx`(`villageId`, `year`, `entryDate`, `id`),
    INDEX `apbdes_entries_villageId_year_activityCode_accountCode_idx`(`villageId`, `year`, `activityCode`, `accountCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `apbdes_month_closes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `closedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedById` INTEGER NULL,
    `verifiedAt` DATETIME(3) NULL,
    `verifiedById` INTEGER NULL,
    `approvedAt` DATETIME(3) NULL,
    `approvedById` INTEGER NULL,

    UNIQUE INDEX `apbdes_month_closes_villageId_year_month_key`(`villageId`, `year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `apbdes_years` ADD CONSTRAINT `apbdes_years_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `apbdes_documents` ADD CONSTRAINT `apbdes_documents_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `apbdes_lines` ADD CONSTRAINT `apbdes_lines_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `apbdes_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `apbdes_lines` ADD CONSTRAINT `apbdes_lines_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `apbdes_entries` ADD CONSTRAINT `apbdes_entries_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `apbdes_month_closes` ADD CONSTRAINT `apbdes_month_closes_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
