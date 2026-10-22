-- AlterTable
ALTER TABLE `citizen_accounts` ADD COLUMN `socialMutedUntil` DATETIME(3) NULL,
    ADD COLUMN `socialStatus` VARCHAR(10) NOT NULL DEFAULT 'OK',
    ADD COLUMN `socialTermsAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `social_posts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `authorType` VARCHAR(10) NOT NULL,
    `authorId` INTEGER NOT NULL,
    `authorName` VARCHAR(255) NOT NULL,
    `authorRt` VARCHAR(10) NULL,
    `content` TEXT NOT NULL,
    `category` VARCHAR(20) NOT NULL,
    `youtubeId` VARCHAR(16) NULL,
    `youtubeTitle` VARCHAR(200) NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'PUBLISHED',
    `moderationNote` VARCHAR(300) NULL,
    `likesCount` INTEGER NOT NULL DEFAULT 0,
    `commentsCount` INTEGER NOT NULL DEFAULT 0,
    `reportsCount` INTEGER NOT NULL DEFAULT 0,
    `editedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `social_posts_villageId_status_createdAt_idx`(`villageId`, `status`, `createdAt` DESC),
    INDEX `social_posts_villageId_category_status_createdAt_idx`(`villageId`, `category`, `status`, `createdAt` DESC),
    INDEX `social_posts_authorType_authorId_createdAt_idx`(`authorType`, `authorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_post_media` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `postId` BIGINT NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `social_post_media_postId_sortOrder_idx`(`postId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_comments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `postId` BIGINT NOT NULL,
    `villageId` INTEGER NOT NULL,
    `authorType` VARCHAR(10) NOT NULL,
    `authorId` INTEGER NOT NULL,
    `authorName` VARCHAR(255) NOT NULL,
    `content` VARCHAR(500) NOT NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'PUBLISHED',
    `reportsCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `social_comments_postId_status_createdAt_idx`(`postId`, `status`, `createdAt`),
    INDEX `social_comments_authorType_authorId_idx`(`authorType`, `authorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_likes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `postId` BIGINT NOT NULL,
    `accountType` VARCHAR(10) NOT NULL,
    `accountId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `social_likes_postId_accountType_accountId_key`(`postId`, `accountType`, `accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_bookmarks` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `postId` BIGINT NOT NULL,
    `accountType` VARCHAR(10) NOT NULL,
    `accountId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `social_bookmarks_accountType_accountId_createdAt_idx`(`accountType`, `accountId`, `createdAt`),
    UNIQUE INDEX `social_bookmarks_postId_accountType_accountId_key`(`postId`, `accountType`, `accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_reports` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `targetType` VARCHAR(10) NOT NULL,
    `targetId` BIGINT NOT NULL,
    `reporterType` VARCHAR(10) NOT NULL,
    `reporterId` INTEGER NOT NULL,
    `reason` VARCHAR(20) NOT NULL,
    `note` VARCHAR(300) NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `social_reports_villageId_status_createdAt_idx`(`villageId`, `status`, `createdAt`),
    UNIQUE INDEX `social_reports_targetType_targetId_reporterType_reporterId_key`(`targetType`, `targetId`, `reporterType`, `reporterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_blocks` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `blockerType` VARCHAR(10) NOT NULL,
    `blockerId` INTEGER NOT NULL,
    `blockedType` VARCHAR(10) NOT NULL,
    `blockedId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `social_blocks_blockerType_blockerId_idx`(`blockerType`, `blockerId`),
    UNIQUE INDEX `social_blocks_blockerType_blockerId_blockedType_blockedId_key`(`blockerType`, `blockerId`, `blockedType`, `blockedId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `social_post_media` ADD CONSTRAINT `social_post_media_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `social_posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `social_comments` ADD CONSTRAINT `social_comments_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `social_posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `social_likes` ADD CONSTRAINT `social_likes_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `social_posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

