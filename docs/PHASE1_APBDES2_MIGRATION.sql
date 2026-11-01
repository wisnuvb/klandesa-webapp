-- Fase 1 butir 3 (lanjutan): DPA/RAK/RAB, SPP, panjar, program sektoral, laporan kepala desa.
-- Jalankan SETELAH PHASE1_APBDES_MIGRATION.sql. Hanya menambah dua kolom pada apbdes_entries (tabel baru, belum berisi data produksi)
-- dan sembilan tabel baru.
ALTER TABLE `apbdes_entries` ADD COLUMN `requestId` INTEGER NULL, ADD COLUMN `panjarId` INTEGER NULL;
CREATE INDEX `apbdes_entries_panjarId_idx` ON `apbdes_entries`(`panjarId`);
CREATE INDEX `apbdes_entries_requestId_idx` ON `apbdes_entries`(`requestId`);

CREATE TABLE `apbdes_activity_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `activityCode` VARCHAR(12) NOT NULL,
    `executorName` VARCHAR(150) NULL,
    `location` VARCHAR(200) NULL,
    `outputName` VARCHAR(200) NULL,
    `outputVolume` DECIMAL(14, 2) NULL,
    `outputUnit` VARCHAR(30) NULL,
    `target` VARCHAR(300) NULL,
    `team` VARCHAR(300) NULL,
    `startMonth` INTEGER NULL,
    `endMonth` INTEGER NULL,
    `realizedVolume` DECIMAL(14, 2) NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'DRAFT',
    `verifiedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `apbdes_activity_plans_villageId_year_activityCode_key`(`villageId`, `year`, `activityCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `apbdes_cash_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `activityCode` VARCHAR(12) NOT NULL,
    `accountCode` VARCHAR(14) NOT NULL,
    `month` INTEGER NOT NULL,
    `amountCents` BIGINT NOT NULL,

    UNIQUE INDEX `apbdes_cash_plans_slot_key`(`villageId`, `year`, `activityCode`, `accountCode`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `apbdes_cost_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `activityCode` VARCHAR(12) NOT NULL,
    `accountCode` VARCHAR(14) NOT NULL,
    `description` VARCHAR(300) NOT NULL,
    `volume` DECIMAL(14, 2) NOT NULL,
    `unit` VARCHAR(30) NOT NULL,
    `unitPriceCents` BIGINT NOT NULL,
    `amountCents` BIGINT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `apbdes_cost_items_villageId_year_activityCode_idx`(`villageId`, `year`, `activityCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `apbdes_pay_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `number` INTEGER NOT NULL,
    `activityCode` VARCHAR(12) NOT NULL,
    `mode` VARCHAR(10) NOT NULL,
    `executorName` VARCHAR(150) NULL,
    `workPeriod` VARCHAR(100) NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'DIAJUKAN',
    `rejectNote` VARCHAR(300) NULL,
    `hasReceipt` BOOLEAN NOT NULL DEFAULT false,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `verifiedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `paidAt` DATE NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `apbdes_pay_requests_villageId_year_number_key`(`villageId`, `year`, `number`),
    INDEX `apbdes_pay_requests_villageId_year_status_idx`(`villageId`, `year`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `apbdes_pay_request_lines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestId` INTEGER NOT NULL,
    `accountCode` VARCHAR(14) NOT NULL,
    `description` VARCHAR(300) NOT NULL,
    `payee` VARCHAR(150) NULL,
    `amountCents` BIGINT NOT NULL,
    `taxCents` BIGINT NOT NULL DEFAULT 0,
    `taxKind` VARCHAR(30) NULL,

    INDEX `apbdes_pay_request_lines_requestId_idx`(`requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `apbdes_panjars` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `requestId` INTEGER NOT NULL,
    `activityCode` VARCHAR(12) NOT NULL,
    `holderName` VARCHAR(150) NOT NULL,
    `givenAt` DATE NOT NULL,
    `givenCents` BIGINT NOT NULL,
    `dueAt` DATE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `apbdes_panjars_requestId_key`(`requestId`),
    INDEX `apbdes_panjars_villageId_year_idx`(`villageId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `apbdes_panjar_spj` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `panjarId` INTEGER NOT NULL,
    `villageId` INTEGER NOT NULL,
    `spjDate` DATE NOT NULL,
    `voucherNo` VARCHAR(60) NOT NULL,
    `description` VARCHAR(300) NOT NULL,
    `amountCents` BIGINT NOT NULL,
    `checkedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `apbdes_panjar_spj_panjarId_idx`(`panjarId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `apbdes_external_programs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `programName` VARCHAR(200) NOT NULL,
    `activityKind` VARCHAR(200) NOT NULL,
    `location` VARCHAR(200) NULL,
    `volume` DECIMAL(14, 2) NOT NULL,
    `unit` VARCHAR(30) NOT NULL,
    `amountCents` BIGINT NOT NULL,
    `fundSource` VARCHAR(150) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `apbdes_external_programs_villageId_year_idx`(`villageId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `village_reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `kind` VARCHAR(12) NOT NULL,
    `year` INTEGER NOT NULL,
    `sections` JSON NOT NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'DRAFT',
    `submittedAt` DATE NULL,
    `submittedNote` VARCHAR(200) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `village_reports_villageId_kind_year_key`(`villageId`, `kind`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `apbdes_activity_plans` ADD CONSTRAINT `apbdes_activity_plans_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `apbdes_cash_plans` ADD CONSTRAINT `apbdes_cash_plans_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `apbdes_cost_items` ADD CONSTRAINT `apbdes_cost_items_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `apbdes_pay_requests` ADD CONSTRAINT `apbdes_pay_requests_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `apbdes_pay_request_lines` ADD CONSTRAINT `apbdes_pay_request_lines_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `apbdes_pay_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `apbdes_panjars` ADD CONSTRAINT `apbdes_panjars_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `apbdes_panjar_spj` ADD CONSTRAINT `apbdes_panjar_spj_panjarId_fkey` FOREIGN KEY (`panjarId`) REFERENCES `apbdes_panjars`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `apbdes_external_programs` ADD CONSTRAINT `apbdes_external_programs_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `village_reports` ADD CONSTRAINT `village_reports_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
