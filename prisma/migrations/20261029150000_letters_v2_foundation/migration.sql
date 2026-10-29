-- Fondasi surat v2: penghitung nomor atomik, snapshot template pada surat, HTML surat hingga 16MB.
-- Aditif: tidak menghapus/mengubah data. contentHtml TEXT -> MEDIUMTEXT hanya memperlebar kolom.

-- AlterTable
ALTER TABLE `mail_services` ADD COLUMN `templateSnapshot` JSON NULL,
    MODIFY `contentHtml` MEDIUMTEXT NULL;

-- CreateTable
CREATE TABLE `mail_number_counters` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `scopeKey` VARCHAR(80) NOT NULL,
    `lastValue` INTEGER NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `mail_number_counters_villageId_scopeKey_key`(`villageId`, `scopeKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `mail_number_counters` ADD CONSTRAINT `mail_number_counters_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

