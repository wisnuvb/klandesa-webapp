-- Koperasi Desa (internal records). CoopAppRole = ENUM on cooperative_members.

-- CreateTable
CREATE TABLE `cooperatives` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `address` TEXT NULL,
    `phone` VARCHAR(50) NULL,
    `email` VARCHAR(255) NULL,
    `legalNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cooperatives_villageId_key`(`villageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cooperative_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cooperativeId` INTEGER NOT NULL,
    `residentId` INTEGER NULL,
    `name` VARCHAR(255) NOT NULL,
    `nik` VARCHAR(16) NULL,
    `membershipNumber` VARCHAR(50) NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `notes` TEXT NULL,
    `linkedUserId` INTEGER NULL,
    `coopAppRole` ENUM('none', 'board', 'manager') NOT NULL DEFAULT 'none',
    `boardTitle` VARCHAR(120) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `cooperative_members_cooperativeId_status_idx`(`cooperativeId`, `status`),
    INDEX `cooperative_members_residentId_idx`(`residentId`),
    UNIQUE INDEX `cooperative_members_cooperativeId_linkedUserId_key`(`cooperativeId`, `linkedUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cooperative_ledger_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cooperativeId` INTEGER NOT NULL,
    `entryDate` DATE NOT NULL,
    `direction` VARCHAR(20) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `cooperative_ledger_entries_cooperativeId_entryDate_idx`(`cooperativeId`, `entryDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cooperatives` ADD CONSTRAINT `cooperatives_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cooperative_members` ADD CONSTRAINT `cooperative_members_cooperativeId_fkey` FOREIGN KEY (`cooperativeId`) REFERENCES `cooperatives`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cooperative_members` ADD CONSTRAINT `cooperative_members_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `residents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cooperative_members` ADD CONSTRAINT `cooperative_members_linkedUserId_fkey` FOREIGN KEY (`linkedUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cooperative_ledger_entries` ADD CONSTRAINT `cooperative_ledger_entries_cooperativeId_fkey` FOREIGN KEY (`cooperativeId`) REFERENCES `cooperatives`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cooperative_ledger_entries` ADD CONSTRAINT `cooperative_ledger_entries_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
