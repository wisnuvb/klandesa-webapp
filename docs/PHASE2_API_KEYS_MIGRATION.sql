-- CreateTable
CREATE TABLE `api_keys` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `keyPrefix` VARCHAR(16) NOT NULL,
    `keyHash` VARCHAR(64) NOT NULL,
    `scopes` JSON NOT NULL,
    `createdById` INTEGER NULL,
    `expiresAt` DATETIME(3) NULL,
    `revokedAt` DATETIME(3) NULL,
    `revokedById` INTEGER NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `api_keys_keyHash_key`(`keyHash`),
    INDEX `api_keys_villageId_revokedAt_idx`(`villageId`, `revokedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_access_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `apiKeyId` INTEGER NULL,
    `keyPrefix` VARCHAR(16) NULL,
    `method` VARCHAR(10) NOT NULL,
    `path` VARCHAR(200) NOT NULL,
    `status` INTEGER NOT NULL,
    `ipAddress` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `api_access_logs_villageId_createdAt_idx`(`villageId`, `createdAt` DESC),
    INDEX `api_access_logs_apiKeyId_createdAt_idx`(`apiKeyId`, `createdAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_access_logs` ADD CONSTRAINT `api_access_logs_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_access_logs` ADD CONSTRAINT `api_access_logs_apiKeyId_fkey` FOREIGN KEY (`apiKeyId`) REFERENCES `api_keys`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

