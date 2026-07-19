-- CreateTable
CREATE TABLE `regional_news_feed_snapshots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `regionKey` VARCHAR(120) NOT NULL,
    `province` VARCHAR(255) NOT NULL,
    `regency` VARCHAR(255) NOT NULL,
    `items` JSON NOT NULL,
    `fetchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `lastError` TEXT NULL,

    UNIQUE INDEX `regional_news_feed_snapshots_regionKey_key`(`regionKey`),
    INDEX `regional_news_feed_snapshots_province_regency_idx`(`province`, `regency`),
    INDEX `regional_news_feed_snapshots_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
