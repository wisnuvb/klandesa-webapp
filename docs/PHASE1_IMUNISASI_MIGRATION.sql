-- Fase 1 butir 8 (imunisasi anak): hanya MENAMBAH satu tabel baru.
CREATE TABLE `immunization_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `residentId` INTEGER NOT NULL,
    `vaccineCode` VARCHAR(20) NOT NULL,
    `givenAt` DATE NOT NULL,
    `note` VARCHAR(200) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `immunization_records_residentId_vaccineCode_key`(`residentId`, `vaccineCode`),
    INDEX `immunization_records_villageId_vaccineCode_idx`(`villageId`, `vaccineCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `immunization_records` ADD CONSTRAINT `immunization_records_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `immunization_records` ADD CONSTRAINT `immunization_records_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `residents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
