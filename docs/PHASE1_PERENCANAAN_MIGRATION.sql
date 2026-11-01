-- Paket 0 + 1 (docs/PLAN_CELAH_FUNGSI.md): Musyawarah Desa dan siklus RKP Desa.
-- ADITIF: tujuh tabel baru + kolom NULLABLE pada rkpdes_activities (data lama tidak berubah). Tanpa DROP.
-- Urutan wajib: village_meetings → rkpdes_documents → sisanya → ALTER rkpdes_activities.

CREATE TABLE `village_meetings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `kind` VARCHAR(20) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `topic` VARCHAR(300) NULL,
    `planYear` INTEGER NULL,
    `scheduledOn` DATE NOT NULL,
    `startTime` VARCHAR(5) NULL,
    `location` VARCHAR(200) NULL,
    `agenda` TEXT NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'PLANNED',
    `heldOn` DATE NULL,
    `minutesNo` VARCHAR(100) NULL,
    `minutesText` TEXT NULL,
    `finalizedAt` DATETIME(3) NULL,
    `finalizedById` INTEGER NULL,
    `cancelReason` VARCHAR(300) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `village_meetings_villageId_kind_scheduledOn_idx`(`villageId`, `kind`, `scheduledOn`),
    INDEX `village_meetings_villageId_planYear_idx`(`villageId`, `planYear`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `village_meeting_attendees` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `meetingId` INTEGER NOT NULL,
    `residentId` INTEGER NULL,
    `name` VARCHAR(150) NOT NULL,
    `unsur` VARCHAR(20) NOT NULL,
    `gender` VARCHAR(1) NULL,
    `present` BOOLEAN NOT NULL DEFAULT false,
    `note` VARCHAR(200) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `village_meeting_attendees_meetingId_idx`(`meetingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `village_meeting_decisions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `meetingId` INTEGER NOT NULL,
    `seq` INTEGER NOT NULL,
    `text` VARCHAR(1000) NOT NULL,
    `refType` VARCHAR(30) NULL,
    `refId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `village_meeting_decisions_meetingId_seq_key`(`meetingId`, `seq`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `rkpdes_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `revision` INTEGER NOT NULL DEFAULT 0,
    `changeReason` VARCHAR(20) NULL,
    `planId` INTEGER NULL,
    `musdesMeetingId` INTEGER NULL,
    `musrenbangMeetingId` INTEGER NULL,
    `teamFormedAt` DATE NULL,
    `teamDecreeRef` VARCHAR(150) NULL,
    `paguReceivedAt` DATE NULL,
    `evaluationText` TEXT NULL,
    `draftReadyAt` DATE NULL,
    `draftMinutesRef` VARCHAR(150) NULL,
    `draftApprovedAt` DATE NULL,
    `draftApprovedById` INTEGER NULL,
    `legalDocumentId` INTEGER NULL,
    `usulanSubmittedAt` DATE NULL,
    `usulanRef` VARCHAR(150) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rkpdes_documents_villageId_year_revision_key`(`villageId`, `year`, `revision`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `rkpdes_team_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `documentId` INTEGER NOT NULL,
    `residentId` INTEGER NULL,
    `name` VARCHAR(150) NOT NULL,
    `role` VARCHAR(12) NOT NULL,
    `position` VARCHAR(100) NULL,
    `gender` VARCHAR(1) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `rkpdes_team_members_documentId_idx`(`documentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `rkpdes_pagu_indicative` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `documentId` INTEGER NOT NULL,
    `source` VARCHAR(12) NOT NULL,
    `amountCents` BIGINT NOT NULL,
    `note` VARCHAR(200) NULL,

    UNIQUE INDEX `rkpdes_pagu_indicative_documentId_source_key`(`documentId`, `source`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `rkpdes_incoming_programs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `documentId` INTEGER NOT NULL,
    `level` VARCHAR(10) NOT NULL,
    `agency` VARCHAR(150) NULL,
    `name` VARCHAR(200) NOT NULL,
    `location` VARCHAR(200) NULL,
    `amountCents` BIGINT NULL,
    `note` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `rkpdes_incoming_programs_documentId_idx`(`documentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Kolom siklus RKP Desa pada tabel yang sudah ada (semua NULL atau berdefault; baris lama tak berubah).
ALTER TABLE `rkpdes_activities`
    ADD COLUMN `documentId` INTEGER NULL,
    ADD COLUMN `activityCode` VARCHAR(12) NULL,
    ADD COLUMN `fundSource` VARCHAR(10) NULL,
    ADD COLUMN `method` VARCHAR(14) NULL,
    ADD COLUMN `outputName` VARCHAR(200) NULL,
    ADD COLUMN `outputVolume` DECIMAL(14, 2) NULL,
    ADD COLUMN `outputUnit` VARCHAR(30) NULL,
    ADD COLUMN `executorChair` VARCHAR(150) NULL,
    ADD COLUMN `executorSecretary` VARCHAR(150) NULL,
    ADD COLUMN `executorTreasurer` VARCHAR(150) NULL,
    ADD COLUMN `executorMembers` VARCHAR(500) NULL,
    ADD COLUMN `executorHasWoman` BOOLEAN NULL,
    ADD COLUMN `rabVerifiedAt` DATE NULL,
    ADD COLUMN `proposeToRegency` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `rkpdes_activities_documentId_idx` ON `rkpdes_activities`(`documentId`);

ALTER TABLE `village_meetings` ADD CONSTRAINT `village_meetings_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `village_meeting_attendees` ADD CONSTRAINT `village_meeting_attendees_meetingId_fkey` FOREIGN KEY (`meetingId`) REFERENCES `village_meetings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `village_meeting_attendees` ADD CONSTRAINT `village_meeting_attendees_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `residents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `village_meeting_decisions` ADD CONSTRAINT `village_meeting_decisions_meetingId_fkey` FOREIGN KEY (`meetingId`) REFERENCES `village_meetings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `rkpdes_documents` ADD CONSTRAINT `rkpdes_documents_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `rkpdes_documents` ADD CONSTRAINT `rkpdes_documents_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `rpjmdes_plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `rkpdes_documents` ADD CONSTRAINT `rkpdes_documents_musdesMeetingId_fkey` FOREIGN KEY (`musdesMeetingId`) REFERENCES `village_meetings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `rkpdes_documents` ADD CONSTRAINT `rkpdes_documents_musrenbangMeetingId_fkey` FOREIGN KEY (`musrenbangMeetingId`) REFERENCES `village_meetings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `rkpdes_documents` ADD CONSTRAINT `rkpdes_documents_legalDocumentId_fkey` FOREIGN KEY (`legalDocumentId`) REFERENCES `legal_documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `rkpdes_team_members` ADD CONSTRAINT `rkpdes_team_members_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `rkpdes_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `rkpdes_team_members` ADD CONSTRAINT `rkpdes_team_members_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `residents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `rkpdes_pagu_indicative` ADD CONSTRAINT `rkpdes_pagu_indicative_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `rkpdes_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `rkpdes_incoming_programs` ADD CONSTRAINT `rkpdes_incoming_programs_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `rkpdes_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `rkpdes_activities` ADD CONSTRAINT `rkpdes_activities_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `rkpdes_documents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
