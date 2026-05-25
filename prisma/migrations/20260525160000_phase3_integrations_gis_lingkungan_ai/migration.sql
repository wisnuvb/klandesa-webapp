-- Phase 3: Integrasi, GIS, Lingkungan, Kebencanaan

CREATE TABLE `integration_sync_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `adapterId` VARCHAR(50) NOT NULL,
    `direction` VARCHAR(20) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `recordCount` INTEGER NOT NULL DEFAULT 0,
    `payloadMeta` JSON NULL,
    `errorMessage` TEXT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `integration_sync_logs_villageId_startedAt_idx`(`villageId`, `startedAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `village_assets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `assetType` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `rt` VARCHAR(10) NULL,
    `rw` VARCHAR(10) NULL,
    `condition` VARCHAR(50) NOT NULL DEFAULT 'good',
    `sdgGoalIds` JSON NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `village_assets_villageId_idx`(`villageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `infrastructure_projects` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `assetId` INTEGER NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `projectType` VARCHAR(50) NOT NULL,
    `budget` DECIMAL(15, 2) NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `rt` VARCHAR(10) NULL,
    `rw` VARCHAR(10) NULL,
    `sdgGoalIds` JSON NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'planned',
    `startDate` DATE NULL,
    `endDate` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `infrastructure_projects_villageId_status_idx`(`villageId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `waste_banks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `managerName` VARCHAR(255) NULL,
    `rt` VARCHAR(10) NULL,
    `rw` VARCHAR(10) NULL,
    `address` TEXT NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `wasteTypes` JSON NOT NULL,
    `monthlyKg` DOUBLE NOT NULL DEFAULT 0,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `waste_banks_villageId_idx`(`villageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `environmental_incidents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `incidentType` VARCHAR(50) NOT NULL,
    `severity` VARCHAR(50) NOT NULL DEFAULT 'medium',
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `rt` VARCHAR(10) NULL,
    `rw` VARCHAR(10) NULL,
    `reportedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(50) NOT NULL DEFAULT 'open',
    `checklist` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `environmental_incidents_villageId_status_idx`(`villageId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `disaster_points` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `disasterType` VARCHAR(50) NOT NULL,
    `riskLevel` VARCHAR(50) NOT NULL DEFAULT 'medium',
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `rt` VARCHAR(10) NULL,
    `rw` VARCHAR(10) NULL,
    `notes` TEXT NULL,
    `evacuationPlan` TEXT NULL,
    `lastCheckedAt` DATETIME(3) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'monitored',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `disaster_points_villageId_riskLevel_idx`(`villageId`, `riskLevel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `integration_sync_logs` ADD CONSTRAINT `integration_sync_logs_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `village_assets` ADD CONSTRAINT `village_assets_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `infrastructure_projects` ADD CONSTRAINT `infrastructure_projects_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `infrastructure_projects` ADD CONSTRAINT `infrastructure_projects_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `village_assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `waste_banks` ADD CONSTRAINT `waste_banks_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `environmental_incidents` ADD CONSTRAINT `environmental_incidents_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `disaster_points` ADD CONSTRAINT `disaster_points_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
