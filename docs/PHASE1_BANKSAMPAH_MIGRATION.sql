-- Fase 1 butir 8 (bank sampah transaksional): hanya MENAMBAH tiga tabel baru.
CREATE TABLE `waste_bank_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `wasteBankId` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `pricePerKg` DECIMAL(12, 2) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `waste_bank_items_wasteBankId_name_key`(`wasteBankId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `waste_bank_accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `wasteBankId` INTEGER NOT NULL,
    `residentId` INTEGER NULL,
    `name` VARCHAR(150) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `waste_bank_accounts_wasteBankId_idx`(`wasteBankId`),
    INDEX `waste_bank_accounts_residentId_idx`(`residentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `waste_bank_txs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `wasteBankId` INTEGER NOT NULL,
    `accountId` INTEGER NOT NULL,
    `itemId` INTEGER NULL,
    `kind` VARCHAR(8) NOT NULL,
    `weightKg` DECIMAL(10, 3) NULL,
    `pricePerKg` DECIMAL(12, 2) NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `itemName` VARCHAR(100) NULL,
    `txDate` DATE NOT NULL,
    `note` VARCHAR(200) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `waste_bank_txs_wasteBankId_txDate_idx`(`wasteBankId`, `txDate`),
    INDEX `waste_bank_txs_accountId_idx`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `waste_bank_items` ADD CONSTRAINT `waste_bank_items_wasteBankId_fkey` FOREIGN KEY (`wasteBankId`) REFERENCES `waste_banks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `waste_bank_accounts` ADD CONSTRAINT `waste_bank_accounts_wasteBankId_fkey` FOREIGN KEY (`wasteBankId`) REFERENCES `waste_banks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `waste_bank_accounts` ADD CONSTRAINT `waste_bank_accounts_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `residents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `waste_bank_txs` ADD CONSTRAINT `waste_bank_txs_wasteBankId_fkey` FOREIGN KEY (`wasteBankId`) REFERENCES `waste_banks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `waste_bank_txs` ADD CONSTRAINT `waste_bank_txs_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `waste_bank_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `waste_bank_txs` ADD CONSTRAINT `waste_bank_txs_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `waste_bank_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
