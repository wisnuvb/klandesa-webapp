-- Paket 3 / Tahapan RPJM Desa. ADITIF: 18 kolom nullable/berdefault pada rpjmdes_plans (data RPJM Desa lama tidak berubah dan tidak terkunci),
-- 1 kolom nullable pada rkpdes_activities (tautan opsional ke program RPJM Desa), 3 tabel baru (rpjm_team_members, rpjm_programs, rpjm_events),
-- indeks unik pada rpjmdes_plans.legalDocumentId (NULL berganda diizinkan MySQL), dan kunci asing berefek SET NULL.
-- Tidak ada DROP/UPDATE/DELETE pada data lama. Rollback: PHASE3_RPJM_ROLLBACK.sql (data tahapan, program, tim, dan tautan RKP dibuang; dokumen RPJM Desa lama utuh).

-- AlterTable
ALTER TABLE `rpjmdes_plans` ADD COLUMN `draftApprovedAt` DATE NULL,
    ADD COLUMN `draftApprovedById` INTEGER NULL,
    ADD COLUMN `draftMeetingId` INTEGER NULL,
    ADD COLUMN `draftMinutesRef` VARCHAR(150) NULL,
    ADD COLUMN `draftReadyAt` DATE NULL,
    ADD COLUMN `enactedBeforeApp` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `headInauguratedOn` DATE NULL,
    ADD COLUMN `legalDocumentId` INTEGER NULL,
    ADD COLUMN `musdesMeetingId` INTEGER NULL,
    ADD COLUMN `policyDirection` TEXT NULL,
    ADD COLUMN `reopenCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `reviewDoneAt` DATE NULL,
    ADD COLUMN `reviewMinutesRef` VARCHAR(150) NULL,
    ADD COLUMN `reviewSummary` TEXT NULL,
    ADD COLUMN `sdgsPlanNote` VARCHAR(300) NULL,
    ADD COLUMN `sdgsPlanRecordedAt` DATE NULL,
    ADD COLUMN `teamDecreeRef` VARCHAR(150) NULL,
    ADD COLUMN `teamFormedAt` DATE NULL;

-- AlterTable
ALTER TABLE `rkpdes_activities` ADD COLUMN `rpjmProgramId` INTEGER NULL;

-- CreateTable
CREATE TABLE `rpjm_team_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `planId` INTEGER NOT NULL,
    `residentId` INTEGER NULL,
    `name` VARCHAR(150) NOT NULL,
    `role` VARCHAR(12) NOT NULL,
    `position` VARCHAR(100) NULL,
    `gender` VARCHAR(1) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `rpjm_team_members_planId_idx`(`planId`),
    INDEX `rpjm_team_members_villageId_idx`(`villageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rpjm_programs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `planId` INTEGER NOT NULL,
    `fieldCode` VARCHAR(1) NOT NULL,
    `year` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `activityCode` VARCHAR(12) NULL,
    `location` VARCHAR(255) NULL,
    `outputVolume` DECIMAL(14, 2) NULL,
    `outputUnit` VARCHAR(30) NULL,
    `benefit` VARCHAR(300) NULL,
    `budgetCents` BIGINT NULL,
    `fundSource` VARCHAR(10) NULL,
    `method` VARCHAR(14) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `rpjm_programs_planId_year_idx`(`planId`, `year`),
    INDEX `rpjm_programs_planId_fieldCode_idx`(`planId`, `fieldCode`),
    INDEX `rpjm_programs_villageId_idx`(`villageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rpjm_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `planId` INTEGER NOT NULL,
    `kind` VARCHAR(12) NOT NULL,
    `reason` VARCHAR(20) NULL,
    `note` VARCHAR(300) NOT NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `rpjm_events_planId_idx`(`planId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `rpjmdes_plans_legalDocumentId_key` ON `rpjmdes_plans`(`legalDocumentId`);

-- CreateIndex
CREATE INDEX `rkpdes_activities_rpjmProgramId_idx` ON `rkpdes_activities`(`rpjmProgramId`);

-- AddForeignKey
ALTER TABLE `rpjmdes_plans` ADD CONSTRAINT `rpjmdes_plans_musdesMeetingId_fkey` FOREIGN KEY (`musdesMeetingId`) REFERENCES `village_meetings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rpjmdes_plans` ADD CONSTRAINT `rpjmdes_plans_draftMeetingId_fkey` FOREIGN KEY (`draftMeetingId`) REFERENCES `village_meetings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rpjmdes_plans` ADD CONSTRAINT `rpjmdes_plans_legalDocumentId_fkey` FOREIGN KEY (`legalDocumentId`) REFERENCES `legal_documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rkpdes_activities` ADD CONSTRAINT `rkpdes_activities_rpjmProgramId_fkey` FOREIGN KEY (`rpjmProgramId`) REFERENCES `rpjm_programs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rpjm_team_members` ADD CONSTRAINT `rpjm_team_members_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rpjm_team_members` ADD CONSTRAINT `rpjm_team_members_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `rpjmdes_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rpjm_programs` ADD CONSTRAINT `rpjm_programs_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rpjm_programs` ADD CONSTRAINT `rpjm_programs_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `rpjmdes_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rpjm_events` ADD CONSTRAINT `rpjm_events_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rpjm_events` ADD CONSTRAINT `rpjm_events_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `rpjmdes_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
