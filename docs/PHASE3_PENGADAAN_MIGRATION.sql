-- Paket 3 / Pengadaan barang/jasa, kerja sama desa, dan impor IDM. ADITIF: 9 tabel baru, tanpa mengubah tabel/data lama.
--   procurement_settings, procurement_packages, procurement_team_members, procurement_offers
--   village_agreements, village_agreements_parties, village_agreements_budget_items
--   idm_scores, idm_indicators
-- Batasan CHECK (MySQL >= 8.0.16 menegakkan; versi lama mengabaikannya dengan aman) menjaga invarian uang/progres di tingkat basis data.
-- Rollback: PHASE3_PENGADAAN_ROLLBACK.sql (data pada sembilan tabel ini HILANG; tabel lain tidak tersentuh).

CREATE TABLE `procurement_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `directLimitCents` BIGINT NULL,
    `offerLimitCents` BIGINT NULL,
    `basisNote` VARCHAR(300) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `procurement_settings_villageId_key`(`villageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `procurement_packages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `number` INTEGER NOT NULL,
    `activityCode` VARCHAR(12) NOT NULL,
    `accountCode` VARCHAR(14) NULL,
    `title` VARCHAR(200) NOT NULL,
    `scope` VARCHAR(1000) NULL,
    `location` VARCHAR(200) NULL,
    `mode` VARCHAR(10) NOT NULL,
    `method` VARCHAR(22) NULL,
    `hpsCents` BIGINT NOT NULL,
    `executorName` VARCHAR(150) NULL,
    `executorTitle` VARCHAR(100) NULL,
    `plannedStartOn` DATE NULL,
    `plannedEndOn` DATE NULL,
    `tpkDecreeNumber` VARCHAR(100) NULL,
    `tpkDecreeDate` DATE NULL,
    `planAnnouncedOn` DATE NULL,
    `resultAnnouncedOn` DATE NULL,
    `singleProviderReason` VARCHAR(300) NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'PERSIAPAN',
    `cancelReason` VARCHAR(300) NULL,
    `negotiationNumber` VARCHAR(100) NULL,
    `negotiationDate` DATE NULL,
    `negotiationNote` VARCHAR(500) NULL,
    `contractNumber` VARCHAR(100) NULL,
    `contractDate` DATE NULL,
    `contractCents` BIGINT NULL,
    `contractStartOn` DATE NULL,
    `contractEndOn` DATE NULL,
    `bastNumber` VARCHAR(100) NULL,
    `bastDate` DATE NULL,
    `bastHandedBy` VARCHAR(150) NULL,
    `bastReceivedBy` VARCHAR(150) NULL,
    `bastNote` VARCHAR(500) NULL,
    `handoverToHeadOn` DATE NULL,
    `progressPct` INTEGER NOT NULL DEFAULT 0,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `procurement_packages_villageId_year_status_idx`(`villageId`, `year`, `status`),
    INDEX `procurement_packages_villageId_year_activityCode_idx`(`villageId`, `year`, `activityCode`),
    UNIQUE INDEX `procurement_packages_villageId_year_number_key`(`villageId`, `year`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `procurement_team_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `packageId` INTEGER NOT NULL,
    `villageId` INTEGER NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `role` VARCHAR(10) NOT NULL,
    `element` VARCHAR(12) NOT NULL,
    `position` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `procurement_team_members_packageId_idx`(`packageId`),
    INDEX `procurement_team_members_villageId_idx`(`villageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `procurement_offers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `packageId` INTEGER NOT NULL,
    `villageId` INTEGER NOT NULL,
    `providerName` VARCHAR(150) NOT NULL,
    `providerAddress` VARCHAR(200) NULL,
    `offeredOn` DATE NOT NULL,
    `priceCents` BIGINT NOT NULL,
    `passed` BOOLEAN NOT NULL DEFAULT false,
    `evaluationNote` VARCHAR(300) NULL,
    `negotiatedCents` BIGINT NULL,
    `isWinner` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `procurement_offers_packageId_idx`(`packageId`),
    INDEX `procurement_offers_villageId_idx`(`villageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `village_agreements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `kind` VARCHAR(12) NOT NULL,
    `initiative` VARCHAR(12) NULL,
    `title` VARCHAR(200) NOT NULL,
    `field` VARCHAR(12) NOT NULL,
    `scope` VARCHAR(2000) NULL,
    `procedures` VARCHAR(2000) NULL,
    `rights` VARCHAR(2000) NULL,
    `funding` VARCHAR(1000) NULL,
    `amendment` VARCHAR(1000) NULL,
    `dispute` VARCHAR(1000) NULL,
    `termStartOn` DATE NULL,
    `termEndOn` DATE NULL,
    `status` VARCHAR(14) NOT NULL DEFAULT 'PERSIAPAN',
    `prepMusdesId` INTEGER NULL,
    `inPlanConfirmed` BOOLEAN NOT NULL DEFAULT false,
    `offerSentOn` DATE NULL,
    `offerMusdesId` INTEGER NULL,
    `offerDecision` VARCHAR(8) NULL,
    `offerReplyOn` DATE NULL,
    `consultedOn` DATE NULL,
    `consultRequired` BOOLEAN NOT NULL DEFAULT false,
    `agreedOn` DATE NULL,
    `signedOn` DATE NULL,
    `signedNumber` VARCHAR(100) NULL,
    `witnessName` VARCHAR(150) NULL,
    `reportedOn` DATE NULL,
    `reportedToCamatOn` DATE NULL,
    `endReason` VARCHAR(24) NULL,
    `endNote` VARCHAR(300) NULL,
    `endedOn` DATE NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `village_agreements_villageId_status_idx`(`villageId`, `status`),
    INDEX `village_agreements_villageId_year_idx`(`villageId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `village_agreements_parties` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `agreementId` INTEGER NOT NULL,
    `villageId` INTEGER NOT NULL,
    `kind` VARCHAR(12) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `representativeName` VARCHAR(150) NULL,
    `representativeTitle` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `village_agreements_parties_agreementId_idx`(`agreementId`),
    INDEX `village_agreements_parties_villageId_idx`(`villageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `village_agreements_budget_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `agreementId` INTEGER NOT NULL,
    `villageId` INTEGER NOT NULL,
    `description` VARCHAR(300) NOT NULL,
    `amountCents` BIGINT NOT NULL,
    `bearerId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `village_agreements_budget_items_agreementId_idx`(`agreementId`),
    INDEX `village_agreements_budget_items_villageId_idx`(`villageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `idm_scores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `iks` DECIMAL(14, 4) NULL,
    `ike` DECIMAL(14, 4) NULL,
    `ikl` DECIMAL(14, 4) NULL,
    `idm` DECIMAL(14, 4) NULL,
    `status` VARCHAR(40) NULL,
    `sourceName` VARCHAR(200) NULL,
    `importedById` INTEGER NULL,
    `importedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `idm_scores_villageId_year_key`(`villageId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `idm_indicators` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `dimension` VARCHAR(4) NOT NULL,
    `code` VARCHAR(30) NULL,
    `name` VARCHAR(300) NOT NULL,
    `score` DECIMAL(14, 4) NOT NULL,
    `maxScore` DECIMAL(14, 4) NULL,
    `note` VARCHAR(500) NULL,
    `suggestion` VARCHAR(1000) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `idm_indicators_villageId_year_dimension_idx`(`villageId`, `year`, `dimension`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `procurement_settings` ADD CONSTRAINT `procurement_settings_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `procurement_packages` ADD CONSTRAINT `procurement_packages_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `procurement_team_members` ADD CONSTRAINT `procurement_team_members_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `procurement_packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `procurement_offers` ADD CONSTRAINT `procurement_offers_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `procurement_packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `village_agreements` ADD CONSTRAINT `village_agreements_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `village_agreements_parties` ADD CONSTRAINT `village_agreements_parties_agreementId_fkey` FOREIGN KEY (`agreementId`) REFERENCES `village_agreements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `village_agreements_budget_items` ADD CONSTRAINT `village_agreements_budget_items_agreementId_fkey` FOREIGN KEY (`agreementId`) REFERENCES `village_agreements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `village_agreements_budget_items` ADD CONSTRAINT `village_agreements_budget_items_bearerId_fkey` FOREIGN KEY (`bearerId`) REFERENCES `village_agreements_parties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `idm_scores` ADD CONSTRAINT `idm_scores_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `idm_indicators` ADD CONSTRAINT `idm_indicators_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Batasan CHECK (tidak dihasilkan Prisma)
ALTER TABLE `procurement_settings` ADD CONSTRAINT `procurement_settings_limits_chk` CHECK ((`directLimitCents` IS NULL OR `directLimitCents` > 0) AND (`offerLimitCents` IS NULL OR `offerLimitCents` > 0));
ALTER TABLE `procurement_packages` ADD CONSTRAINT `procurement_packages_hps_chk` CHECK (`hpsCents` > 0);
ALTER TABLE `procurement_packages` ADD CONSTRAINT `procurement_packages_progress_chk` CHECK (`progressPct` BETWEEN 0 AND 100);
ALTER TABLE `procurement_packages` ADD CONSTRAINT `procurement_packages_contract_chk` CHECK (`contractCents` IS NULL OR `contractCents` > 0);
ALTER TABLE `procurement_offers` ADD CONSTRAINT `procurement_offers_price_chk` CHECK (`priceCents` > 0 AND (`negotiatedCents` IS NULL OR (`negotiatedCents` > 0 AND `negotiatedCents` <= `priceCents`)));
ALTER TABLE `village_agreements_budget_items` ADD CONSTRAINT `village_agreements_budget_items_amount_chk` CHECK (`amountCents` > 0);
ALTER TABLE `idm_indicators` ADD CONSTRAINT `idm_indicators_score_chk` CHECK (`score` >= 0 AND (`maxScore` IS NULL OR `maxScore` > 0));
