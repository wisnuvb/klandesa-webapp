-- Fase 1 butir 8 (KIA dan lansia): hanya MENAMBAH tiga tabel baru.
CREATE TABLE `pregnancies` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `residentId` INTEGER NOT NULL,
    `lmpDate` DATE NOT NULL,
    `edd` DATE NOT NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'HAMIL',
    `openKey` INTEGER NULL,
    `endedAt` DATE NULL,
    `endNote` VARCHAR(300) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pregnancies_residentId_openKey_key`(`residentId`, `openKey`),
    INDEX `pregnancies_villageId_status_idx`(`villageId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `pregnancy_visits` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pregnancyId` INTEGER NOT NULL,
    `villageId` INTEGER NOT NULL,
    `visitDate` DATE NOT NULL,
    `gestationWeeks` INTEGER NOT NULL,
    `trimester` INTEGER NOT NULL,
    `provider` VARCHAR(10) NOT NULL,
    `weightKg` DECIMAL(5, 1) NULL,
    `systolic` INTEGER NULL,
    `diastolic` INTEGER NULL,
    `upperArmCm` DECIMAL(4, 1) NULL,
    `fundalHeightCm` DECIMAL(4, 1) NULL,
    `fetalHeartRate` INTEGER NULL,
    `hemoglobin` DECIMAL(3, 1) NULL,
    `tetanusGiven` BOOLEAN NOT NULL DEFAULT false,
    `ironTablets` INTEGER NULL,
    `ultrasound` BOOLEAN NOT NULL DEFAULT false,
    `dangerSigns` JSON NOT NULL,
    `note` VARCHAR(300) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pregnancy_visits_pregnancyId_visitDate_idx`(`pregnancyId`, `visitDate`),
    INDEX `pregnancy_visits_villageId_visitDate_idx`(`villageId`, `visitDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `elderly_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `residentId` INTEGER NOT NULL,
    `checkedAt` DATE NOT NULL,
    `weightKg` DECIMAL(5, 1) NULL,
    `heightCm` DECIMAL(4, 1) NULL,
    `systolic` INTEGER NULL,
    `diastolic` INTEGER NULL,
    `glucoseMgDl` INTEGER NULL,
    `glucoseType` VARCHAR(10) NULL,
    `adlScore` INTEGER NULL,
    `note` VARCHAR(300) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `elderly_checks_villageId_checkedAt_idx`(`villageId`, `checkedAt`),
    INDEX `elderly_checks_residentId_checkedAt_idx`(`residentId`, `checkedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `pregnancies` ADD CONSTRAINT `pregnancies_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `pregnancies` ADD CONSTRAINT `pregnancies_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `residents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `pregnancy_visits` ADD CONSTRAINT `pregnancy_visits_pregnancyId_fkey` FOREIGN KEY (`pregnancyId`) REFERENCES `pregnancies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `pregnancy_visits` ADD CONSTRAINT `pregnancy_visits_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `elderly_checks` ADD CONSTRAINT `elderly_checks_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `elderly_checks` ADD CONSTRAINT `elderly_checks_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `residents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
