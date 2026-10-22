-- CreateTable
CREATE TABLE `citizen_accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `residentId` INTEGER NOT NULL,
    `username` VARCHAR(30) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `signupMethod` VARCHAR(20) NOT NULL DEFAULT 'identity',
    `failedAttempts` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,
    `legacyUserId` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `citizen_accounts_residentId_key`(`residentId`),
    UNIQUE INDEX `citizen_accounts_username_key`(`username`),
    INDEX `citizen_accounts_villageId_status_idx`(`villageId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activation_codes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `purpose` VARCHAR(20) NOT NULL,
    `kk` VARCHAR(16) NULL,
    `residentId` INTEGER NULL,
    `codeHash` VARCHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `maxUses` INTEGER NOT NULL DEFAULT 1,
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `activation_codes_codeHash_key`(`codeHash`),
    INDEX `activation_codes_villageId_purpose_idx`(`villageId`, `purpose`),
    INDEX `activation_codes_kk_idx`(`kk`),
    INDEX `activation_codes_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `citizen_accounts` ADD CONSTRAINT `citizen_accounts_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `citizen_accounts` ADD CONSTRAINT `citizen_accounts_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `residents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activation_codes` ADD CONSTRAINT `activation_codes_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

