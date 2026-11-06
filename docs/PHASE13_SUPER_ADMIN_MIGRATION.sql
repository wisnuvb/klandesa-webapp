-- AlterTable
ALTER TABLE `platform_users` ADD COLUMN `recoveryCodeHashes` JSON NULL,
    ADD COLUMN `totpEnabledAt` DATETIME(3) NULL,
    ADD COLUMN `totpSecretEnc` VARCHAR(255) NULL;

-- CreateTable
CREATE TABLE `platform_auth_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `platformUserId` INTEGER NOT NULL,
    `purpose` VARCHAR(20) NOT NULL,
    `tokenHash` VARCHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdByPlatformUserId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `platform_auth_tokens_tokenHash_key`(`tokenHash`),
    INDEX `platform_auth_tokens_platformUserId_purpose_usedAt_idx`(`platformUserId`, `purpose`, `usedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platform_audit_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `actorId` INTEGER NULL,
    `actorEmail` VARCHAR(255) NOT NULL,
    `action` VARCHAR(80) NOT NULL,
    `targetType` VARCHAR(40) NOT NULL,
    `targetId` VARCHAR(100) NULL,
    `villageId` INTEGER NULL,
    `summary` VARCHAR(500) NOT NULL,
    `metadata` JSON NULL,
    `ipAddress` VARCHAR(50) NULL,
    `userAgent` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `platform_audit_logs_createdAt_idx`(`createdAt` DESC),
    INDEX `platform_audit_logs_actorId_createdAt_idx`(`actorId`, `createdAt` DESC),
    INDEX `platform_audit_logs_targetType_targetId_idx`(`targetType`, `targetId`),
    INDEX `platform_audit_logs_villageId_createdAt_idx`(`villageId`, `createdAt` DESC),
    INDEX `platform_audit_logs_action_createdAt_idx`(`action`, `createdAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `billing_invoices_status_paidAt_idx` ON `billing_invoices`(`status`, `paidAt`);

-- AddForeignKey
ALTER TABLE `platform_auth_tokens` ADD CONSTRAINT `platform_auth_tokens_platformUserId_fkey` FOREIGN KEY (`platformUserId`) REFERENCES `platform_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

