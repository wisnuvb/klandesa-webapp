-- AlterTable
ALTER TABLE `mail_templates` ADD COLUMN `catalogKey` VARCHAR(80) NULL;

-- CreateIndex (unique)
CREATE UNIQUE INDEX `mail_templates_catalogKey_key` ON `mail_templates`(`catalogKey`);
