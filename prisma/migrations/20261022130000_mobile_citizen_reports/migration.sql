-- AlterTable
ALTER TABLE `citizen_reports` ADD COLUMN `category` VARCHAR(30) NULL,
    ADD COLUMN `feedbackAt` DATETIME(3) NULL,
    ADD COLUMN `isAnonymous` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `locationLat` DOUBLE NULL,
    ADD COLUMN `locationLng` DOUBLE NULL,
    ADD COLUMN `locationNote` VARCHAR(200) NULL,
    ADD COLUMN `residentId` INTEGER NULL,
    ADD COLUMN `resolvedFeedback` VARCHAR(20) NULL;

-- CreateIndex
CREATE INDEX `citizen_reports_residentId_createdAt_idx` ON `citizen_reports`(`residentId`, `createdAt`);

