-- Fase 1 butir 4 (sisa): produk hukum, register surat masuk/keluar, lembaga desa. Hanya MENAMBAH empat tabel baru.
CREATE TABLE `legal_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `number` VARCHAR(60) NOT NULL,
    `year` INTEGER NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `summary` VARCHAR(1000) NULL,
    `enactedAt` DATE NOT NULL,
    `promulgatedAt` DATE NULL,
    `submittedAt` DATE NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'BERLAKU',
    `revokedAt` DATE NULL,
    `revokedByRef` VARCHAR(200) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `legal_documents_villageId_type_year_number_key`(`villageId`, `type`, `year`, `number`),
    INDEX `legal_documents_villageId_status_year_idx`(`villageId`, `status`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `mail_register` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `direction` VARCHAR(3) NOT NULL,
    `year` INTEGER NOT NULL,
    `agendaNo` INTEGER NOT NULL,
    `letterNumber` VARCHAR(100) NULL,
    `letterDate` DATE NOT NULL,
    `registeredAt` DATE NOT NULL,
    `party` VARCHAR(200) NOT NULL,
    `subject` VARCHAR(300) NOT NULL,
    `nature` VARCHAR(10) NOT NULL DEFAULT 'BIASA',
    `disposition` VARCHAR(1000) NULL,
    `notes` VARCHAR(500) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `mail_register_villageId_direction_year_agendaNo_key`(`villageId`, `direction`, `year`, `agendaNo`),
    INDEX `mail_register_villageId_direction_registeredAt_idx`(`villageId`, `direction`, `registeredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `village_institutions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `decreeNumber` VARCHAR(100) NULL,
    `decreeDate` DATE NULL,
    `periodStart` DATE NULL,
    `periodEnd` DATE NULL,
    `description` VARCHAR(500) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `village_institutions_villageId_type_idx`(`villageId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `institution_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `institutionId` INTEGER NOT NULL,
    `residentId` INTEGER NULL,
    `name` VARCHAR(150) NOT NULL,
    `role` VARCHAR(20) NOT NULL,
    `division` VARCHAR(100) NULL,
    `startsAt` DATE NULL,
    `endsAt` DATE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `institution_members_institutionId_idx`(`institutionId`),
    INDEX `institution_members_villageId_idx`(`villageId`),
    INDEX `institution_members_residentId_idx`(`residentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `legal_documents` ADD CONSTRAINT `legal_documents_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `mail_register` ADD CONSTRAINT `mail_register_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `village_institutions` ADD CONSTRAINT `village_institutions_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `institution_members` ADD CONSTRAINT `institution_members_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `institution_members` ADD CONSTRAINT `institution_members_institutionId_fkey` FOREIGN KEY (`institutionId`) REFERENCES `village_institutions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `institution_members` ADD CONSTRAINT `institution_members_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `residents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
