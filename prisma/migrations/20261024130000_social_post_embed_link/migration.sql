-- AlterTable
ALTER TABLE `social_posts` ADD COLUMN `linkProvider` VARCHAR(10) NULL,
    ADD COLUMN `linkUrl` VARCHAR(500) NULL,
    ADD COLUMN `linkTitle` VARCHAR(200) NULL;
