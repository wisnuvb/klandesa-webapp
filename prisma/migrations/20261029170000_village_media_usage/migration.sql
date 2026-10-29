-- CreateTable
CREATE TABLE `village_media_usage` (
    `villageId` INTEGER NOT NULL,
    `mobileBytes` BIGINT NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`villageId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `village_media_usage` ADD CONSTRAINT `village_media_usage_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
