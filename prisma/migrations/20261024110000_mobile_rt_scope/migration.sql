-- AlterTable
ALTER TABLE `mail_requests` ADD COLUMN `applicantRt` VARCHAR(10) NULL,
    ADD COLUMN `applicantRw` VARCHAR(10) NULL,
    ADD COLUMN `rtDecidedAt` DATETIME(3) NULL,
    ADD COLUMN `rtDecidedByResidentId` INTEGER NULL,
    ADD COLUMN `rtNote` VARCHAR(300) NULL,
    ADD COLUMN `rtStatus` VARCHAR(20) NULL;

-- CreateTable
CREATE TABLE `village_role_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `residentId` INTEGER NOT NULL,
    `role` VARCHAR(10) NOT NULL,
    `rt` VARCHAR(10) NULL,
    `rw` VARCHAR(10) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `village_role_assignments_villageId_role_isActive_idx`(`villageId`, `role`, `isActive`),
    UNIQUE INDEX `village_role_assignments_villageId_residentId_role_key`(`villageId`, `residentId`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `mail_requests_villageId_rtStatus_applicantRt_applicantRw_idx` ON `mail_requests`(`villageId`, `rtStatus`, `applicantRt`, `applicantRw`);
