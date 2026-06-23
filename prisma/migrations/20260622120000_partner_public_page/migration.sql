-- AlterTable
ALTER TABLE `partners`
    ADD COLUMN `publicSlug` VARCHAR(80) NULL,
    ADD COLUMN `publicHeadline` VARCHAR(200) NULL,
    ADD COLUMN `publicBio` TEXT NULL,
    ADD COLUMN `publicWhatsapp` VARCHAR(40) NULL,
    ADD COLUMN `publicPageEnabled` BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX `partners_publicSlug_key` ON `partners`(`publicSlug`);
