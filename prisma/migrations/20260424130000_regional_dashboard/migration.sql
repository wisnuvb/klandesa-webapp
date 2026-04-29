-- CreateTable
CREATE TABLE `regional_users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL,
    `scopeRegency` VARCHAR(255) NOT NULL,
    `scopeDistrict` VARCHAR(255) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLogin` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `regional_users_email_key`(`email`),
    INDEX `regional_users_email_idx`(`email`),
    INDEX `regional_users_scopeRegency_scopeDistrict_idx`(`scopeRegency`, `scopeDistrict`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `regional_access_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `regionalUserId` INTEGER NOT NULL,
    `action` VARCHAR(80) NOT NULL,
    `path` VARCHAR(500) NOT NULL,
    `ip` VARCHAR(45) NULL,
    `userAgent` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `regional_access_logs_regionalUserId_createdAt_idx`(`regionalUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `regional_access_logs` ADD CONSTRAINT `regional_access_logs_regionalUserId_fkey` FOREIGN KEY (`regionalUserId`) REFERENCES `regional_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX `villages_regency_idx` ON `villages`(`regency`);

-- CreateIndex
CREATE INDEX `villages_regency_district_idx` ON `villages`(`regency`, `district`);
