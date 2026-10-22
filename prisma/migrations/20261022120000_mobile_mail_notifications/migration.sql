-- AlterTable
ALTER TABLE `mail_requests` ADD COLUMN `formData` JSON NULL,
    ADD COLUMN `onBehalfResidentId` INTEGER NULL,
    ADD COLUMN `residentId` INTEGER NULL,
    ADD COLUMN `templateId` INTEGER NULL;

-- CreateTable
CREATE TABLE `user_notifications` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `accountType` VARCHAR(20) NOT NULL,
    `accountId` INTEGER NOT NULL,
    `villageId` INTEGER NOT NULL,
    `type` VARCHAR(30) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `body` VARCHAR(500) NULL,
    `deepLink` VARCHAR(200) NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_notifications_accountType_accountId_createdAt_idx`(`accountType`, `accountId`, `createdAt` DESC),
    INDEX `user_notifications_accountType_accountId_readAt_idx`(`accountType`, `accountId`, `readAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `mail_requests_residentId_createdAt_idx` ON `mail_requests`(`residentId`, `createdAt`);

