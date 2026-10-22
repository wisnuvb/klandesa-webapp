-- CreateTable
CREATE TABLE `mobile_sessions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `accountType` VARCHAR(20) NOT NULL,
    `accountId` INTEGER NOT NULL,
    `villageId` INTEGER NOT NULL,
    `role` VARCHAR(50) NOT NULL,
    `refreshHash` VARCHAR(64) NOT NULL,
    `familyId` VARCHAR(36) NOT NULL,
    `prevHash` VARCHAR(64) NULL,
    `deviceId` VARCHAR(100) NULL,
    `platform` VARCHAR(20) NULL,
    `appVersion` VARCHAR(20) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `lastUsedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `mobile_sessions_refreshHash_key`(`refreshHash`),
    INDEX `mobile_sessions_accountType_accountId_idx`(`accountType`, `accountId`),
    INDEX `mobile_sessions_familyId_idx`(`familyId`),
    INDEX `mobile_sessions_prevHash_idx`(`prevHash`),
    INDEX `mobile_sessions_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `device_tokens` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `accountType` VARCHAR(20) NOT NULL,
    `accountId` INTEGER NOT NULL,
    `villageId` INTEGER NOT NULL,
    `expoToken` VARCHAR(255) NOT NULL,
    `platform` VARCHAR(20) NOT NULL,
    `appVersion` VARCHAR(20) NULL,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `disabledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `device_tokens_expoToken_key`(`expoToken`),
    INDEX `device_tokens_accountType_accountId_idx`(`accountType`, `accountId`),
    INDEX `device_tokens_villageId_idx`(`villageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

