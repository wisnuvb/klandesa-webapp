-- Fase 1 butir 8 (polling/pemungutan suara warga): hanya MENAMBAH tiga tabel baru.
CREATE TABLE `polls` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` VARCHAR(1000) NULL,
    `options` JSON NOT NULL,
    `minAge` INTEGER NOT NULL DEFAULT 17,
    `showLive` BOOLEAN NOT NULL DEFAULT false,
    `publishedAt` DATETIME(3) NULL,
    `opensAt` DATETIME(3) NULL,
    `closesAt` DATETIME(3) NOT NULL,
    `closedAt` DATETIME(3) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `polls_villageId_publishedAt_idx`(`villageId`, `publishedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `poll_participations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pollId` INTEGER NOT NULL,
    `residentId` INTEGER NULL,

    UNIQUE INDEX `poll_participations_pollId_residentId_key`(`pollId`, `residentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `poll_votes` (
    `id` CHAR(36) NOT NULL,
    `pollId` INTEGER NOT NULL,
    `optionIndex` INTEGER NOT NULL,

    INDEX `poll_votes_pollId_optionIndex_idx`(`pollId`, `optionIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `polls` ADD CONSTRAINT `polls_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `poll_participations` ADD CONSTRAINT `poll_participations_pollId_fkey` FOREIGN KEY (`pollId`) REFERENCES `polls`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `poll_participations` ADD CONSTRAINT `poll_participations_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `residents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `poll_votes` ADD CONSTRAINT `poll_votes_pollId_fkey` FOREIGN KEY (`pollId`) REFERENCES `polls`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
