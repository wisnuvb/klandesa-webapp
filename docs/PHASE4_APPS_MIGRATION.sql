-- Fase 4 Aplikasi Desa: hanya MENAMBAH dua tabel baru.
CREATE TABLE `app_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `lineageKey` VARCHAR(40) NOT NULL,
    `version` INTEGER NOT NULL,
    `publisherVillageId` INTEGER NULL,
    `publisherName` VARCHAR(150) NOT NULL,
    `official` BOOLEAN NOT NULL DEFAULT false,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `manifest` JSON NOT NULL,
    `manifestHash` VARCHAR(64) NOT NULL,
    `warnings` JSON NOT NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'PENDING',
    `reviewNote` VARCHAR(300) NULL,
    `reviewedById` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `publishedAt` DATETIME(3) NULL,
    `installCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `app_templates_lineageKey_version_key`(`lineageKey`, `version`),
    INDEX `app_templates_status_publishedAt_idx`(`status`, `publishedAt`),
    INDEX `app_templates_publisherVillageId_createdAt_idx`(`publisherVillageId`, `createdAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `app_installs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `templateId` INTEGER NOT NULL,
    `lineageKey` VARCHAR(40) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `tables` JSON NOT NULL,
    `dashboard` JSON NOT NULL,
    `installedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `app_installs_villageId_lineageKey_key`(`villageId`, `lineageKey`),
    INDEX `app_installs_templateId_idx`(`templateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `app_templates` ADD CONSTRAINT `app_templates_publisherVillageId_fkey` FOREIGN KEY (`publisherVillageId`) REFERENCES `villages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `app_installs` ADD CONSTRAINT `app_installs_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `app_installs` ADD CONSTRAINT `app_installs_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `app_templates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
