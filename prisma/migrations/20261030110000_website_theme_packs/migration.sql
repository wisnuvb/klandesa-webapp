-- CreateTable
CREATE TABLE `website_theme_packs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(48) NOT NULL,
    `version` VARCHAR(20) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `authorName` VARCHAR(80) NOT NULL,
    `manifest` JSON NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'submitted',
    `reviewNote` TEXT NULL,
    `reviewedById` INTEGER NULL,
    `reviewedAt` DATETIME(3) NULL,
    `templateId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `website_theme_packs_status_idx`(`status`),
    INDEX `website_theme_packs_templateId_idx`(`templateId`),
    UNIQUE INDEX `website_theme_packs_key_version_key`(`key`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `website_theme_packs` ADD CONSTRAINT `website_theme_packs_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `platform_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
