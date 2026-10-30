-- CreateTable
CREATE TABLE `website_daily_stats` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `day` DATE NOT NULL,
    `pageViews` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `website_daily_stats_villageId_day_key`(`villageId`, `day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `website_daily_stats` ADD CONSTRAINT `website_daily_stats_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
