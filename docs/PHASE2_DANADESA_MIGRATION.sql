-- Paket 2 (docs/PLAN_CELAH_FUNGSI.md): Dana Desa — pagu per tahun, penandaan fokus, pengecualian larangan, bukti publikasi.
-- ADITIF: empat tabel baru, tanpa mengubah tabel lama dan tanpa DROP. Rollback: PHASE2_DANADESA_ROLLBACK.sql.

-- CreateTable
CREATE TABLE `dd_year_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `regularCents` BIGINT NULL,
    `kdmpCents` BIGINT NULL,
    `isMandiri` BOOLEAN NOT NULL DEFAULT false,
    `focusReportedOn` DATE NULL,
    `prevYearReportedOn` DATE NULL,
    `stage1ReportedOn` DATE NULL,
    `note` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `dd_year_settings_villageId_year_key`(`villageId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dd_focus_tags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `activityCode` VARCHAR(12) NOT NULL,
    `focus` VARCHAR(20) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `dd_focus_tags_unique`(`villageId`, `year`, `activityCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dd_rule_exceptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `ruleKey` VARCHAR(8) NOT NULL,
    `activityCode` VARCHAR(12) NOT NULL,
    `accountCode` VARCHAR(14) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `dd_rule_exceptions_unique`(`villageId`, `year`, `ruleKey`, `activityCode`, `accountCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dd_publications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `channel` VARCHAR(20) NOT NULL,
    `publishedOn` DATE NOT NULL,
    `location` VARCHAR(300) NULL,
    `note` VARCHAR(300) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `dd_publications_villageId_year_idx`(`villageId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `dd_year_settings` ADD CONSTRAINT `dd_year_settings_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dd_focus_tags` ADD CONSTRAINT `dd_focus_tags_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dd_rule_exceptions` ADD CONSTRAINT `dd_rule_exceptions_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dd_publications` ADD CONSTRAINT `dd_publications_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
