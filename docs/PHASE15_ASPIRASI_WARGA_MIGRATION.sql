-- Paket 15 / Aspirasi warga publik + peran pengirim formulir kontak. Permintaan pemilik 2026-11-21.
-- ADITIF: 2 kolom + 1 indeks pada `contacts` (baris lama otomatis NULL) dan 5 tabel baru. Tidak mengubah/menghapus kolom atau data lama.
-- WAJIB dijalankan di produksi SEBELUM kode dideploy (Prisma memilih kolom contacts.role/position di kueri Contact), lalu `prisma generate`.
-- Rollback: PHASE15_ASPIRASI_WARGA_ROLLBACK.sql (menghapus semua data aspirasi!).

-- AlterTable
ALTER TABLE `contacts` ADD COLUMN `position` VARCHAR(120) NULL,
    ADD COLUMN `role` VARCHAR(20) NULL;

-- CreateTable
CREATE TABLE `aspiration_areas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(190) NOT NULL,
    `wilayahCode` VARCHAR(20) NULL,
    `kind` VARCHAR(12) NOT NULL DEFAULT 'desa',
    `name` VARCHAR(120) NOT NULL,
    `district` VARCHAR(120) NOT NULL,
    `regency` VARCHAR(120) NOT NULL,
    `province` VARCHAR(120) NOT NULL,
    `villageId` INTEGER NULL,
    `claimedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `aspiration_areas_slug_key`(`slug`),
    UNIQUE INDEX `aspiration_areas_wilayahCode_key`(`wilayahCode`),
    UNIQUE INDEX `aspiration_areas_villageId_key`(`villageId`),
    INDEX `aspiration_areas_name_idx`(`name`),
    INDEX `aspiration_areas_regency_district_idx`(`regency`, `district`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aspirations` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(12) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `areaId` INTEGER NOT NULL,
    `category` VARCHAR(30) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `body` TEXT NOT NULL,
    `locationNote` VARCHAR(200) NULL,
    `photos` JSON NULL,
    `reporterName` VARCHAR(120) NULL,
    `reporterPhone` VARCHAR(30) NULL,
    `reporterEmail` VARCHAR(255) NULL,
    `ipHash` VARCHAR(64) NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'PENDING',
    `publishedAt` DATETIME(3) NULL,
    `moderatedAt` DATETIME(3) NULL,
    `moderatedById` INTEGER NULL,
    `moderationNote` VARCHAR(500) NULL,
    `rejectReason` VARCHAR(300) NULL,
    `noindex` BOOLEAN NOT NULL DEFAULT false,
    `progress` VARCHAR(14) NOT NULL DEFAULT 'NEW',
    `progressAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `aspirations_code_key`(`code`),
    INDEX `aspirations_status_publishedAt_idx`(`status`, `publishedAt` DESC),
    INDEX `aspirations_areaId_status_publishedAt_idx`(`areaId`, `status`, `publishedAt` DESC),
    INDEX `aspirations_ipHash_createdAt_idx`(`ipHash`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aspiration_replies` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `aspirationId` BIGINT NOT NULL,
    `villageId` INTEGER NOT NULL,
    `authorUserId` INTEGER NULL,
    `authorLabel` VARCHAR(160) NOT NULL,
    `kind` VARCHAR(12) NOT NULL,
    `body` TEXT NOT NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'PUBLISHED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `aspiration_replies_aspirationId_createdAt_idx`(`aspirationId`, `createdAt`),
    INDEX `aspiration_replies_villageId_createdAt_idx`(`villageId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `aspiration_flags` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `aspirationId` BIGINT NOT NULL,
    `reason` VARCHAR(20) NOT NULL,
    `detail` TEXT NULL,
    `source` VARCHAR(10) NOT NULL DEFAULT 'PUBLIC',
    `contact` VARCHAR(255) NULL,
    `villageId` INTEGER NULL,
    `ipHash` VARCHAR(64) NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'OPEN',
    `handledAt` DATETIME(3) NULL,
    `handledById` INTEGER NULL,
    `handleNote` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `aspiration_flags_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `aspiration_flags_aspirationId_status_idx`(`aspirationId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `village_claims` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `areaId` INTEGER NOT NULL,
    `villageId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `position` VARCHAR(120) NOT NULL,
    `contactPhone` VARCHAR(30) NULL,
    `evidenceNote` TEXT NOT NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'PENDING',
    `reviewedAt` DATETIME(3) NULL,
    `reviewedById` INTEGER NULL,
    `reviewNote` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `village_claims_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `village_claims_areaId_status_idx`(`areaId`, `status`),
    INDEX `village_claims_villageId_status_idx`(`villageId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `contacts_role_createdAt_idx` ON `contacts`(`role`, `createdAt` DESC);

-- AddForeignKey
ALTER TABLE `aspiration_areas` ADD CONSTRAINT `aspiration_areas_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aspirations` ADD CONSTRAINT `aspirations_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `aspiration_areas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aspiration_replies` ADD CONSTRAINT `aspiration_replies_aspirationId_fkey` FOREIGN KEY (`aspirationId`) REFERENCES `aspirations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aspiration_replies` ADD CONSTRAINT `aspiration_replies_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aspiration_replies` ADD CONSTRAINT `aspiration_replies_authorUserId_fkey` FOREIGN KEY (`authorUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aspiration_flags` ADD CONSTRAINT `aspiration_flags_aspirationId_fkey` FOREIGN KEY (`aspirationId`) REFERENCES `aspirations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `village_claims` ADD CONSTRAINT `village_claims_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `aspiration_areas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `village_claims` ADD CONSTRAINT `village_claims_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `village_claims` ADD CONSTRAINT `village_claims_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

