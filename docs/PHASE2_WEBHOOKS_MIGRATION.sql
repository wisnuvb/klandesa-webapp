-- Fase 2 webhook keluar: hanya MENAMBAH dua tabel baru (tidak ada tabel lama yang diubah).
-- CreateTable
CREATE TABLE `webhook_endpoints` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `secret` VARCHAR(80) NOT NULL,
    `events` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `consecutiveFailures` INTEGER NOT NULL DEFAULT 0,
    `disabledReason` VARCHAR(200) NULL,
    `disabledAt` DATETIME(3) NULL,
    `lastSuccessAt` DATETIME(3) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `webhook_endpoints_villageId_isActive_idx`(`villageId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `webhook_deliveries` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `endpointId` INTEGER NOT NULL,
    `eventId` VARCHAR(40) NOT NULL,
    `eventType` VARCHAR(60) NOT NULL,
    `payload` JSON NOT NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastStatusCode` INTEGER NULL,
    `lastError` VARCHAR(300) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `webhook_deliveries_status_nextAttemptAt_idx`(`status`, `nextAttemptAt`),
    INDEX `webhook_deliveries_endpointId_createdAt_idx`(`endpointId`, `createdAt` DESC),
    INDEX `webhook_deliveries_villageId_createdAt_idx`(`villageId`, `createdAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `webhook_endpoints` ADD CONSTRAINT `webhook_endpoints_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `webhook_deliveries` ADD CONSTRAINT `webhook_deliveries_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `webhook_deliveries` ADD CONSTRAINT `webhook_deliveries_endpointId_fkey` FOREIGN KEY (`endpointId`) REFERENCES `webhook_endpoints`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
