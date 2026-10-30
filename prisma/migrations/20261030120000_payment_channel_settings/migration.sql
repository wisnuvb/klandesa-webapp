-- CreateTable
-- Status kanal pembayaran LinkQu yang diatur admin platform. Tanpa baris = kanal aktif (tidak ada perubahan perilaku).
CREATE TABLE `payment_channel_settings` (
    `code` VARCHAR(40) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `note` VARCHAR(255) NULL,
    `updatedByUserId` INTEGER NULL,
    `updatedByName` VARCHAR(255) NULL,
    `lastError` VARCHAR(255) NULL,
    `lastErrorAt` DATETIME(3) NULL,
    `lastProbeOk` BOOLEAN NULL,
    `lastProbeAt` DATETIME(3) NULL,
    `lastProbeMessage` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
