-- Paket 3 / P4: Bencana & lingkungan (Destana) + primitif kejadian bersama P4/P5. ADITIF: sebelas tabel baru (incident_*, drm_*),
-- tanpa mengubah/menghapus tabel atau data lama. Rollback: PHASE3_BENCANA_ROLLBACK.sql.

-- CreateTable
CREATE TABLE `incident_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `domain` VARCHAR(12) NOT NULL,
    `kind` VARCHAR(40) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` VARCHAR(2000) NULL,
    `occurredAt` DATETIME(3) NOT NULL,
    `severity` VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    `status` VARCHAR(12) NOT NULL DEFAULT 'OPEN',
    `locationText` VARCHAR(255) NULL,
    `rt` VARCHAR(10) NULL,
    `rw` VARCHAR(10) NULL,
    `hamlet` VARCHAR(100) NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `deathCount` INTEGER NULL,
    `missingCount` INTEGER NULL,
    `injuredCount` INTEGER NULL,
    `displacedCount` INTEGER NULL,
    `affectedHouseholds` INTEGER NULL,
    `damagedHouses` INTEGER NULL,
    `lossCents` BIGINT NULL,
    `impactNote` VARCHAR(1000) NULL,
    `supraReportedAt` DATETIME(3) NULL,
    `supraReportedTo` VARCHAR(150) NULL,
    `supraReference` VARCHAR(150) NULL,
    `resolutionNote` VARCHAR(1000) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `incident_events_villageId_domain_status_occurredAt_idx`(`villageId`, `domain`, `status`, `occurredAt`),
    INDEX `incident_events_villageId_domain_occurredAt_idx`(`villageId`, `domain`, `occurredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `incident_responses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `eventId` INTEGER NOT NULL,
    `loggedAt` DATETIME(3) NOT NULL,
    `kind` VARCHAR(30) NOT NULL,
    `description` VARCHAR(1000) NOT NULL,
    `actor` VARCHAR(150) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `incident_responses_eventId_loggedAt_idx`(`eventId`, `loggedAt`),
    INDEX `incident_responses_villageId_idx`(`villageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `incident_logistics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `eventId` INTEGER NOT NULL,
    `householdId` INTEGER NULL,
    `recipientName` VARCHAR(150) NOT NULL,
    `rt` VARCHAR(10) NULL,
    `rw` VARCHAR(10) NULL,
    `item` VARCHAR(100) NOT NULL,
    `itemKey` VARCHAR(100) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unit` VARCHAR(30) NOT NULL,
    `valueCents` BIGINT NULL,
    `fundingSource` VARCHAR(24) NOT NULL,
    `distributedOn` DATE NOT NULL,
    `reference` VARCHAR(150) NULL,
    `note` VARCHAR(300) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `incident_logistics_eventId_distributedOn_idx`(`eventId`, `distributedOn`),
    INDEX `incident_logistics_villageId_householdId_idx`(`villageId`, `householdId`),
    UNIQUE INDEX `incident_logi_dup_uq`(`eventId`, `householdId`, `itemKey`, `distributedOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `incident_status_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `eventId` INTEGER NOT NULL,
    `fromStatus` VARCHAR(12) NULL,
    `toStatus` VARCHAR(12) NOT NULL,
    `note` VARCHAR(500) NULL,
    `byUserId` INTEGER NULL,
    `at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `incident_status_logs_eventId_at_idx`(`eventId`, `at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `drm_hazards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `hazardType` VARCHAR(30) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `riskLevel` VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    `rt` VARCHAR(10) NULL,
    `rw` VARCHAR(10) NULL,
    `hamlet` VARCHAR(100) NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `exposedHouseholds` INTEGER NULL,
    `description` VARCHAR(1000) NULL,
    `lastReviewedOn` DATE NULL,
    `disasterPointId` INTEGER NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `drm_hazards_villageId_riskLevel_idx`(`villageId`, `riskLevel`),
    UNIQUE INDEX `drm_haz_dp_uq`(`villageId`, `disasterPointId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `drm_resources` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `kind` VARCHAR(20) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `locationText` VARCHAR(255) NULL,
    `rt` VARCHAR(10) NULL,
    `rw` VARCHAR(10) NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `capacity` INTEGER NULL,
    `quantity` INTEGER NULL,
    `unit` VARCHAR(30) NULL,
    `condition` VARCHAR(16) NOT NULL DEFAULT 'BELUM_DIPERIKSA',
    `lastCheckedOn` DATE NULL,
    `custodian` VARCHAR(150) NULL,
    `note` VARCHAR(500) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `drm_resources_villageId_kind_idx`(`villageId`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `drm_volunteers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `residentId` INTEGER NOT NULL,
    `team` VARCHAR(100) NULL,
    `role` VARCHAR(60) NULL,
    `skill` VARCHAR(100) NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
    `joinedOn` DATE NULL,
    `skRef` VARCHAR(150) NULL,
    `note` VARCHAR(300) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `drm_volunteers_villageId_status_idx`(`villageId`, `status`),
    UNIQUE INDEX `drm_vol_res_uq`(`villageId`, `residentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `drm_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `kind` VARCHAR(20) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `year` INTEGER NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'DRAF',
    `note` VARCHAR(500) NULL,
    `legalDocumentId` INTEGER NULL,
    `archiveId` BIGINT NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `drm_plans_villageId_kind_idx`(`villageId`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `drm_alerts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `level` VARCHAR(12) NOT NULL,
    `hazardType` VARCHAR(30) NULL,
    `title` VARCHAR(120) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `targetKind` VARCHAR(6) NOT NULL,
    `targets` JSON NULL,
    `eventId` INTEGER NULL,
    `recipientAccounts` INTEGER NOT NULL DEFAULT 0,
    `deviceCount` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(8) NOT NULL DEFAULT 'SENDING',
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `drm_alerts_villageId_createdAt_idx`(`villageId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `drm_readiness_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `source` VARCHAR(8) NOT NULL,
    `code` VARCHAR(40) NULL,
    `label` VARCHAR(200) NULL,
    `status` VARCHAR(8) NOT NULL DEFAULT 'BELUM',
    `note` VARCHAR(500) NULL,
    `updatedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `drm_readiness_items_villageId_source_idx`(`villageId`, `source`),
    UNIQUE INDEX `drm_ready_code_uq`(`villageId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `drm_assessments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `kind` VARCHAR(10) NOT NULL,
    `doneOn` DATE NOT NULL,
    `level` VARCHAR(16) NULL,
    `referenceNo` VARCHAR(150) NULL,
    `note` VARCHAR(500) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `drm_assessments_villageId_kind_doneOn_idx`(`villageId`, `kind`, `doneOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `incident_events` ADD CONSTRAINT `incident_events_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incident_responses` ADD CONSTRAINT `incident_responses_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `incident_events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incident_logistics` ADD CONSTRAINT `incident_logistics_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `incident_events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `incident_status_logs` ADD CONSTRAINT `incident_status_logs_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `incident_events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `drm_hazards` ADD CONSTRAINT `drm_hazards_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `drm_resources` ADD CONSTRAINT `drm_resources_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `drm_volunteers` ADD CONSTRAINT `drm_volunteers_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `drm_plans` ADD CONSTRAINT `drm_plans_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `drm_alerts` ADD CONSTRAINT `drm_alerts_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `drm_readiness_items` ADD CONSTRAINT `drm_readiness_items_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `drm_assessments` ADD CONSTRAINT `drm_assessments_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- Pertahanan berlapis (aplikasi sudah memvalidasi): dampak tak negatif, koordinat berpasangan dan dalam rentang, kamus status/domain
-- tertutup, jumlah distribusi positif. MySQL >= 8.0.16 / MariaDB >= 10.2 menegakkannya; versi lebih lama menerima sintaks ini dan mengabaikannya.
ALTER TABLE `incident_events` ADD CONSTRAINT `incident_events_counts_chk` CHECK ((`deathCount` IS NULL OR `deathCount` >= 0) AND (`missingCount` IS NULL OR `missingCount` >= 0) AND (`injuredCount` IS NULL OR `injuredCount` >= 0) AND (`displacedCount` IS NULL OR `displacedCount` >= 0) AND (`affectedHouseholds` IS NULL OR `affectedHouseholds` >= 0) AND (`damagedHouses` IS NULL OR `damagedHouses` >= 0) AND (`lossCents` IS NULL OR `lossCents` >= 0));
ALTER TABLE `incident_events` ADD CONSTRAINT `incident_events_geo_chk` CHECK ((`lat` IS NULL) = (`lng` IS NULL) AND (`lat` IS NULL OR (`lat` BETWEEN -90 AND 90 AND `lng` BETWEEN -180 AND 180)));
ALTER TABLE `incident_events` ADD CONSTRAINT `incident_events_enum_chk` CHECK (`domain` IN ('BENCANA', 'KEAMANAN') AND `status` IN ('OPEN', 'RESPONDING', 'RESOLVED', 'CLOSED', 'CANCELLED') AND `severity` IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));
ALTER TABLE `incident_logistics` ADD CONSTRAINT `incident_logistics_qty_chk` CHECK (`quantity` > 0 AND (`valueCents` IS NULL OR `valueCents` >= 0));
ALTER TABLE `drm_hazards` ADD CONSTRAINT `drm_hazards_geo_chk` CHECK ((`lat` IS NULL) = (`lng` IS NULL) AND (`lat` IS NULL OR (`lat` BETWEEN -90 AND 90 AND `lng` BETWEEN -180 AND 180)));
ALTER TABLE `drm_resources` ADD CONSTRAINT `drm_resources_num_chk` CHECK ((`capacity` IS NULL OR `capacity` >= 0) AND (`quantity` IS NULL OR `quantity` >= 0));
ALTER TABLE `drm_resources` ADD CONSTRAINT `drm_resources_geo_chk` CHECK ((`lat` IS NULL) = (`lng` IS NULL) AND (`lat` IS NULL OR (`lat` BETWEEN -90 AND 90 AND `lng` BETWEEN -180 AND 180)));
