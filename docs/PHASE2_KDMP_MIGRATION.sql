-- Paket 2 / P2.g: progres KDMP. ADITIF: empat tabel baru, tanpa mengubah tabel lama. Rollback: PHASE2_KDMP_ROLLBACK.sql.

-- CreateTable
CREATE TABLE `kdmp_disbursements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `receivedOn` DATE NOT NULL,
    `amountCents` BIGINT NOT NULL,
    `reference` VARCHAR(150) NULL,
    `note` VARCHAR(300) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `kdmp_disbursements_villageId_year_idx`(`villageId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kdmp_facilities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `kind` VARCHAR(12) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `location` VARCHAR(200) NULL,
    `contractCents` BIGINT NULL,
    `progressPct` INTEGER NOT NULL DEFAULT 0,
    `progressOn` DATE NULL,
    `operatingOn` DATE NULL,
    `note` VARCHAR(300) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `kdmp_facilities_villageId_year_idx`(`villageId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kdmp_facility_progress` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `facilityId` INTEGER NOT NULL,
    `villageId` INTEGER NOT NULL,
    `recordedOn` DATE NOT NULL,
    `progressPct` INTEGER NOT NULL,
    `note` VARCHAR(300) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `kdmp_facility_progress_facilityId_recordedOn_idx`(`facilityId`, `recordedOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kdmp_installments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `facilityId` INTEGER NULL,
    `paidOn` DATE NOT NULL,
    `amountCents` BIGINT NOT NULL,
    `payee` VARCHAR(150) NOT NULL,
    `reference` VARCHAR(150) NULL,
    `note` VARCHAR(300) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `kdmp_installments_villageId_year_idx`(`villageId`, `year`),
    INDEX `kdmp_installments_facilityId_idx`(`facilityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `kdmp_disbursements` ADD CONSTRAINT `kdmp_disbursements_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kdmp_facilities` ADD CONSTRAINT `kdmp_facilities_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kdmp_facility_progress` ADD CONSTRAINT `kdmp_facility_progress_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `kdmp_facilities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kdmp_installments` ADD CONSTRAINT `kdmp_installments_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kdmp_installments` ADD CONSTRAINT `kdmp_installments_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `kdmp_facilities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

