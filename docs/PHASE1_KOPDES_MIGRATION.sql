-- Fase 1 butir 7 (Kopdes Merah Putih, sisi desa): hanya MENAMBAH satu tabel baru.
CREATE TABLE `cooperative_formations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cooperativeId` INTEGER NOT NULL,
    `musdesusAt` DATE NULL,
    `musdesusRef` VARCHAR(150) NULL,
    `musdesusNotes` VARCHAR(2000) NULL,
    `kadesApprovedAt` DATE NULL,
    `deedNumber` VARCHAR(100) NULL,
    `deedDate` DATE NULL,
    `notaryName` VARCHAR(150) NULL,
    `commitmentRef` VARCHAR(150) NULL,
    `commitmentAmount` DECIMAL(15, 2) NULL,
    `submittedToRegencyAt` DATE NULL,
    `skNumber` VARCHAR(100) NULL,
    `skDate` DATE NULL,
    `npwpAt` DATE NULL,
    `simkopdesAt` DATE NULL,
    `notes` VARCHAR(1000) NULL,
    `updatedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cooperative_formations_cooperativeId_key`(`cooperativeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `cooperative_formations` ADD CONSTRAINT `cooperative_formations_cooperativeId_fkey` FOREIGN KEY (`cooperativeId`) REFERENCES `cooperatives`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
