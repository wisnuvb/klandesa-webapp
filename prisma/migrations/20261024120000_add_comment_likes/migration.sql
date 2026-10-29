-- AlterTable
ALTER TABLE `social_comments` ADD COLUMN `likesCount` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `social_comment_likes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `commentId` BIGINT NOT NULL,
    `accountType` VARCHAR(10) NOT NULL,
    `accountId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `social_comment_likes_commentId_accountType_accountId_key`(`commentId`, `accountType`, `accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `social_comment_likes` ADD CONSTRAINT `social_comment_likes_commentId_fkey` FOREIGN KEY (`commentId`) REFERENCES `social_comments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
