-- Paket 2 / P2.e (docs/PLAN_CELAH_FUNGSI.md): BLT Desa. ADITIF: tiga tabel baru, tanpa mengubah tabel lama. Rollback: PHASE2_BLT_ROLLBACK.sql.

-- CreateTable
CREATE TABLE `blt_programs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `monthlyCents` BIGINT NOT NULL,
    `totalMonths` INTEGER NOT NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'DRAFT',
    `musdesMeetingId` INTEGER NULL,
    `decreeNumber` VARCHAR(100) NULL,
    `decreeDate` DATE NULL,
    `reportedToRegencyOn` DATE NULL,
    `note` VARCHAR(500) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `blt_programs_villageId_year_key`(`villageId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blt_beneficiaries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `programId` INTEGER NOT NULL,
    `villageId` INTEGER NOT NULL,
    `residentId` INTEGER NULL,
    `name` VARCHAR(255) NOT NULL,
    `kk` VARCHAR(16) NULL,
    `source` VARCHAR(10) NOT NULL,
    `criteria` VARCHAR(20) NULL,
    `category` VARCHAR(100) NOT NULL,
    `jobGroup` VARCHAR(100) NOT NULL,
    `startMonth` INTEGER NOT NULL DEFAULT 1,
    `status` VARCHAR(10) NOT NULL DEFAULT 'AKTIF',
    `endedReason` VARCHAR(300) NULL,
    `endedMeetingId` INTEGER NULL,
    `replacesId` INTEGER NULL,
    `decreeRef` VARCHAR(150) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `blt_beneficiaries_programId_status_idx`(`programId`, `status`),
    INDEX `blt_beneficiaries_villageId_residentId_idx`(`villageId`, `residentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blt_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `programId` INTEGER NOT NULL,
    `villageId` INTEGER NOT NULL,
    `beneficiaryId` INTEGER NOT NULL,
    `monthFrom` INTEGER NOT NULL,
    `monthTo` INTEGER NOT NULL,
    `amountCents` BIGINT NOT NULL,
    `method` VARCHAR(8) NOT NULL,
    `paidOn` DATE NOT NULL,
    `receivedBy` VARCHAR(150) NULL,
    `note` VARCHAR(300) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `blt_payments_beneficiaryId_idx`(`beneficiaryId`),
    INDEX `blt_payments_programId_villageId_idx`(`programId`, `villageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `blt_programs` ADD CONSTRAINT `blt_programs_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blt_programs` ADD CONSTRAINT `blt_programs_musdesMeetingId_fkey` FOREIGN KEY (`musdesMeetingId`) REFERENCES `village_meetings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blt_beneficiaries` ADD CONSTRAINT `blt_beneficiaries_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `blt_programs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blt_beneficiaries` ADD CONSTRAINT `blt_beneficiaries_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `residents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blt_payments` ADD CONSTRAINT `blt_payments_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `blt_programs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blt_payments` ADD CONSTRAINT `blt_payments_beneficiaryId_fkey` FOREIGN KEY (`beneficiaryId`) REFERENCES `blt_beneficiaries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
