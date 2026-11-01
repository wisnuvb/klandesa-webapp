-- Paket 3 / P7 Kalender kepatuhan laporan desa. ADITIF: 2 tabel baru (katalog tenggat yang dapat ditimpa, catatan pengiriman
-- laporan per desa). Tidak mengubah atau menghapus data lama. Rollback: PHASE3_KALENDER_ROLLBACK.sql.

-- CreateTable
CREATE TABLE `compliance_catalog_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `scope` VARCHAR(8) NOT NULL,
    `regencyKey` VARCHAR(120) NOT NULL DEFAULT '',
    `provinceKey` VARCHAR(120) NOT NULL DEFAULT '',
    `itemKey` VARCHAR(40) NOT NULL,
    `fromYear` INTEGER NOT NULL,
    `disabled` BOOLEAN NOT NULL DEFAULT false,
    `title` VARCHAR(200) NULL,
    `recipient` VARCHAR(200) NULL,
    `ruleKind` VARCHAR(12) NULL,
    `yearOffset` INTEGER NULL,
    `month` INTEGER NULL,
    `day` INTEGER NULL,
    `event` VARCHAR(20) NULL,
    `amount` INTEGER NULL,
    `unit` VARCHAR(8) NULL,
    `verification` VARCHAR(1) NOT NULL DEFAULT 'K',
    `basis` VARCHAR(300) NULL,
    `note` VARCHAR(500) NULL,
    `updatedByRegionalId` INTEGER NULL,
    `updatedByLabel` VARCHAR(120) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `compliance_catalog_entries_regencyKey_provinceKey_idx`(`regencyKey`, `provinceKey`),
    UNIQUE INDEX `compliance_catalog_unique`(`scope`, `regencyKey`, `provinceKey`, `itemKey`, `fromYear`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `compliance_report_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `itemKey` VARCHAR(40) NOT NULL,
    `status` VARCHAR(8) NOT NULL,
    `sentOn` DATE NULL,
    `referenceNo` VARCHAR(150) NULL,
    `note` VARCHAR(500) NULL,
    `archiveId` BIGINT NULL,
    `updatedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `compliance_report_records_villageId_year_idx`(`villageId`, `year`),
    UNIQUE INDEX `compliance_record_unique`(`villageId`, `year`, `itemKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `compliance_report_records` ADD CONSTRAINT `compliance_report_records_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
