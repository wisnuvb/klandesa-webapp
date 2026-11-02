-- Paket 7 / Lampiran generik (tautan rekaman modul -> Arsip Digital). ADITIF: 1 tabel baru.
-- Tidak mengubah atau menghapus data lama. Rollback: PHASE7_LAMPIRAN_ROLLBACK.sql.

-- CreateTable
CREATE TABLE `record_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `entityType` VARCHAR(30) NOT NULL,
    `entityId` BIGINT NOT NULL,
    `archiveId` BIGINT NOT NULL,
    `label` VARCHAR(150) NOT NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `record_attachments_villageId_entityType_entityId_idx`(`villageId`, `entityType`, `entityId`),
    INDEX `record_attachments_villageId_archiveId_idx`(`villageId`, `archiveId`),
    UNIQUE INDEX `record_attachment_unique`(`villageId`, `entityType`, `entityId`, `archiveId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `record_attachments` ADD CONSTRAINT `record_attachments_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

