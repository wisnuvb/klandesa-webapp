-- CreateTable
CREATE TABLE `contacts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(30) NULL,
    `subject` VARCHAR(120) NOT NULL,
    `message` TEXT NOT NULL,
    `source` VARCHAR(50) NOT NULL DEFAULT 'landing',
    `isResponded` BOOLEAN NOT NULL DEFAULT false,
    `respondedAt` DATETIME(3) NULL,
    `respondedByUserId` INTEGER NULL,
    `ipAddress` VARCHAR(80) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `contacts_isResponded_createdAt_idx`(`isResponded`, `createdAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_respondedByUserId_fkey` FOREIGN KEY (`respondedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

