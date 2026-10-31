-- DRAFT Fase 1 kependudukan (aditif). BELUM diterapkan ke DB mana pun, BELUM di prisma/migrations.
-- Dihasilkan offline: prisma migrate diff dari prisma/schema.prisma ke skema usulan. Lihat docs/PHASE1_KEPENDUDUKAN_DESIGN.md.
-- Satu-satunya perubahan pada tabel lama: residents + 3 kolom NULL (householdId, wilayahUnitId, dusunUnitId), indeks, dan FK.

-- AlterTable
ALTER TABLE `residents` ADD COLUMN `dusunUnitId` INTEGER NULL,
    ADD COLUMN `householdId` INTEGER NULL,
    ADD COLUMN `wilayahUnitId` INTEGER NULL;

-- CreateTable
CREATE TABLE `households` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `kkNumber` VARCHAR(16) NOT NULL,
    `headResidentId` INTEGER NULL,
    `address` VARCHAR(500) NOT NULL,
    `rt` VARCHAR(10) NULL,
    `rw` VARCHAR(10) NULL,
    `hamlet` VARCHAR(100) NULL,
    `wilayahUnitId` INTEGER NULL,
    `dusunUnitId` INTEGER NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `households_villageId_status_idx`(`villageId`, `status`),
    INDEX `households_villageId_wilayahUnitId_idx`(`villageId`, `wilayahUnitId`),
    INDEX `households_villageId_dusunUnitId_idx`(`villageId`, `dusunUnitId`),
    UNIQUE INDEX `households_villageId_kkNumber_key`(`villageId`, `kkNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wilayah_units` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `type` VARCHAR(10) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `canonicalKey` VARCHAR(200) NOT NULL,
    `parentId` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `wilayah_units_villageId_type_idx`(`villageId`, `type`),
    UNIQUE INDEX `wilayah_units_villageId_canonicalKey_key`(`villageId`, `canonicalKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resident_mutations` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `source` VARCHAR(20) NOT NULL DEFAULT 'web',
    `effectiveDate` DATE NOT NULL,
    `residentId` INTEGER NULL,
    `residentName` VARCHAR(255) NULL,
    `residentNikLast4` VARCHAR(4) NULL,
    `rt` VARCHAR(10) NULL,
    `rw` VARCHAR(10) NULL,
    `householdKk` VARCHAR(16) NULL,
    `details` JSON NULL,
    `requestedById` INTEGER NULL,
    `decidedById` INTEGER NULL,
    `decidedAt` DATETIME(3) NULL,
    `rejectionReason` VARCHAR(500) NULL,
    `appliedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `resident_mutations_villageId_effectiveDate_idx`(`villageId`, `effectiveDate`),
    INDEX `resident_mutations_villageId_status_idx`(`villageId`, `status`),
    INDEX `resident_mutations_residentId_idx`(`residentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resident_archives` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `residentId` INTEGER NOT NULL,
    `snapshot` JSON NOT NULL,
    `reason` VARCHAR(500) NULL,
    `deletedById` INTEGER NULL,
    `deletedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `resident_archives_villageId_deletedAt_idx`(`villageId`, `deletedAt` DESC),
    INDEX `resident_archives_villageId_residentId_idx`(`villageId`, `residentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `residents_villageId_householdId_idx` ON `residents`(`villageId`, `householdId`);

-- CreateIndex
CREATE INDEX `residents_villageId_wilayahUnitId_idx` ON `residents`(`villageId`, `wilayahUnitId`);

-- CreateIndex
CREATE INDEX `residents_villageId_dusunUnitId_idx` ON `residents`(`villageId`, `dusunUnitId`);

-- AddForeignKey
ALTER TABLE `residents` ADD CONSTRAINT `residents_householdId_fkey` FOREIGN KEY (`householdId`) REFERENCES `households`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `residents` ADD CONSTRAINT `residents_wilayahUnitId_fkey` FOREIGN KEY (`wilayahUnitId`) REFERENCES `wilayah_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `residents` ADD CONSTRAINT `residents_dusunUnitId_fkey` FOREIGN KEY (`dusunUnitId`) REFERENCES `wilayah_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `households` ADD CONSTRAINT `households_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `households` ADD CONSTRAINT `households_headResidentId_fkey` FOREIGN KEY (`headResidentId`) REFERENCES `residents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `households` ADD CONSTRAINT `households_wilayahUnitId_fkey` FOREIGN KEY (`wilayahUnitId`) REFERENCES `wilayah_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `households` ADD CONSTRAINT `households_dusunUnitId_fkey` FOREIGN KEY (`dusunUnitId`) REFERENCES `wilayah_units`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wilayah_units` ADD CONSTRAINT `wilayah_units_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wilayah_units` ADD CONSTRAINT `wilayah_units_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `wilayah_units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resident_mutations` ADD CONSTRAINT `resident_mutations_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resident_mutations` ADD CONSTRAINT `resident_mutations_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `residents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resident_archives` ADD CONSTRAINT `resident_archives_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

