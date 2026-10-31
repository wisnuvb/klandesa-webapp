-- Fase 1 butir 4 (Aset Desa, Permendagri 1/2016): hanya MENAMBAH satu tabel baru.
CREATE TABLE `inventory_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `mapAssetId` INTEGER NULL,
    `name` VARCHAR(200) NOT NULL,
    `category` VARCHAR(40) NOT NULL,
    `itemCode` VARCHAR(60) NULL,
    `identity` VARCHAR(255) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `origin` VARCHAR(20) NOT NULL,
    `acquiredYear` INTEGER NOT NULL,
    `acquiredAt` DATE NULL,
    `acquisitionValue` DECIMAL(15, 2) NULL,
    `condition` VARCHAR(20) NOT NULL DEFAULT 'BAIK',
    `location` VARCHAR(255) NULL,
    `notes` VARCHAR(1000) NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
    `disposedAt` DATE NULL,
    `disposalReason` VARCHAR(20) NULL,
    `disposalDecree` VARCHAR(100) NULL,
    `disposalNote` VARCHAR(500) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `inventory_items_villageId_status_category_idx`(`villageId`, `status`, `category`),
    INDEX `inventory_items_mapAssetId_idx`(`mapAssetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_mapAssetId_fkey` FOREIGN KEY (`mapAssetId`) REFERENCES `village_assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
