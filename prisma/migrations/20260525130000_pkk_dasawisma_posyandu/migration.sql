-- PKK & Dasawisma — Posyandu sessions and visits

-- CreateTable
CREATE TABLE `dasawisma` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `rt` VARCHAR(10) NOT NULL,
    `rw` VARCHAR(10) NOT NULL,
    `leaderName` VARCHAR(255) NOT NULL,
    `memberCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `dasawisma_villageId_idx`(`villageId`),
    UNIQUE INDEX `dasawisma_villageId_rt_rw_key`(`villageId`, `rt`, `rw`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `posyandu_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `sessionDate` DATE NOT NULL,
    `location` VARCHAR(255) NOT NULL,
    `dasawismaId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `posyandu_sessions_villageId_sessionDate_idx`(`villageId`, `sessionDate` DESC),
    INDEX `posyandu_sessions_dasawismaId_idx`(`dasawismaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `posyandu_visits` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sessionId` INTEGER NOT NULL,
    `residentId` INTEGER NOT NULL,
    `weightKg` DOUBLE NULL,
    `heightCm` DOUBLE NULL,
    `notes` TEXT NULL,
    `isStunting` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `posyandu_visits_residentId_idx`(`residentId`),
    INDEX `posyandu_visits_sessionId_idx`(`sessionId`),
    UNIQUE INDEX `posyandu_visits_sessionId_residentId_key`(`sessionId`, `residentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `dasawisma` ADD CONSTRAINT `dasawisma_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posyandu_sessions` ADD CONSTRAINT `posyandu_sessions_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posyandu_sessions` ADD CONSTRAINT `posyandu_sessions_dasawismaId_fkey` FOREIGN KEY (`dasawismaId`) REFERENCES `dasawisma`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posyandu_visits` ADD CONSTRAINT `posyandu_visits_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `posyandu_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posyandu_visits` ADD CONSTRAINT `posyandu_visits_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `residents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
