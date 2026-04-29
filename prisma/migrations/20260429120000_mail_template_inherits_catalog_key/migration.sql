-- AlterTable
ALTER TABLE `mail_templates` ADD COLUMN `inheritsCatalogKey` VARCHAR(80) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `mail_templates_villageId_inheritsCatalogKey_key` ON `mail_templates`(`villageId`, `inheritsCatalogKey`);
