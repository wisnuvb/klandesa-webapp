-- CreateTable
CREATE TABLE `digital_archive_folders` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `parentId` BIGINT NULL,
    `name` VARCHAR(255) NOT NULL,
    `path` VARCHAR(600) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `digital_archive_folders_villageId_path_key`(`villageId`, `path`),
    INDEX `digital_archive_folders_villageId_parentId_idx`(`villageId`, `parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `digital_archive_folders` ADD CONSTRAINT `digital_archive_folders_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `digital_archive_folders` ADD CONSTRAINT `digital_archive_folders_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `digital_archive_folders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `digital_archives` ADD COLUMN `folderId` BIGINT NULL,
    ADD COLUMN `storageKey` VARCHAR(600) NULL;

-- CreateIndex
CREATE INDEX `digital_archives_villageId_folderId_idx` ON `digital_archives`(`villageId`, `folderId`);

-- AddForeignKey
ALTER TABLE `digital_archives` ADD CONSTRAINT `digital_archives_folderId_fkey` FOREIGN KEY (`folderId`) REFERENCES `digital_archive_folders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
