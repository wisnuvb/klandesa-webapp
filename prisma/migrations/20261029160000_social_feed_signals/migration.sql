-- CreateTable
CREATE TABLE `social_post_signals` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `postId` BIGINT NOT NULL,
    `accountType` VARCHAR(10) NOT NULL,
    `accountId` INTEGER NOT NULL,
    `seenForYou` INTEGER NOT NULL DEFAULT 0,
    `seenLatest` INTEGER NOT NULL DEFAULT 0,
    `openForYou` INTEGER NOT NULL DEFAULT 0,
    `openLatest` INTEGER NOT NULL DEFAULT 0,
    `shares` INTEGER NOT NULL DEFAULT 0,
    `hidden` BOOLEAN NOT NULL DEFAULT false,
    `firstSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `social_post_signals_accountType_accountId_lastSeenAt_idx`(`accountType`, `accountId`, `lastSeenAt`),
    INDEX `social_post_signals_villageId_lastSeenAt_idx`(`villageId`, `lastSeenAt`),
    UNIQUE INDEX `social_post_signals_postId_accountType_accountId_key`(`postId`, `accountType`, `accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_interests` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `accountType` VARCHAR(10) NOT NULL,
    `accountId` INTEGER NOT NULL,
    `key` VARCHAR(80) NOT NULL,
    `score` DOUBLE NOT NULL,
    `touchedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `social_interests_accountType_accountId_score_idx`(`accountType`, `accountId`, `score`),
    UNIQUE INDEX `social_interests_accountType_accountId_key_key`(`accountType`, `accountId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `social_post_signals` ADD CONSTRAINT `social_post_signals_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `social_posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
