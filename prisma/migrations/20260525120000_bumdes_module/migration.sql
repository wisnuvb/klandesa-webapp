-- BUMDes (Badan Usaha Milik Desa) — internal village business records

-- CreateTable
CREATE TABLE `bumdes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `address` TEXT NULL,
    `phone` VARCHAR(50) NULL,
    `email` VARCHAR(255) NULL,
    `legalNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bumdes_villageId_key`(`villageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bumdes_units` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bumdesId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `category` VARCHAR(100) NULL,
    `description` TEXT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bumdes_units_bumdesId_status_idx`(`bumdesId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bumdes_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bumdesId` INTEGER NOT NULL,
    `unitId` INTEGER NOT NULL,
    `entryDate` DATE NOT NULL,
    `direction` VARCHAR(20) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bumdes_transactions_bumdesId_entryDate_idx`(`bumdesId`, `entryDate`),
    INDEX `bumdes_transactions_unitId_entryDate_idx`(`unitId`, `entryDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bumdes_assets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bumdesId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `value` DECIMAL(15, 2) NULL,
    `acquiredAt` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bumdes_assets_bumdesId_idx`(`bumdesId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bumdes` ADD CONSTRAINT `bumdes_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bumdes_units` ADD CONSTRAINT `bumdes_units_bumdesId_fkey` FOREIGN KEY (`bumdesId`) REFERENCES `bumdes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bumdes_transactions` ADD CONSTRAINT `bumdes_transactions_bumdesId_fkey` FOREIGN KEY (`bumdesId`) REFERENCES `bumdes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bumdes_transactions` ADD CONSTRAINT `bumdes_transactions_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `bumdes_units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bumdes_transactions` ADD CONSTRAINT `bumdes_transactions_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bumdes_assets` ADD CONSTRAINT `bumdes_assets_bumdesId_fkey` FOREIGN KEY (`bumdesId`) REFERENCES `bumdes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
