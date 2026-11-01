-- Paket 3 / P5: Keamanan & ketertiban (Satlinmas, ronda, mediasi, kerawanan). ADITIF: tiga belas tabel baru (security_*), tanpa mengubah
-- atau menghapus tabel/data lama (kejadian keamanan memakai incident_events dari PHASE3_BENCANA_MIGRATION.sql, yang HARUS diterapkan lebih dulu).
-- Rollback: PHASE3_KEAMANAN_ROLLBACK.sql.

-- CreateTable
CREATE TABLE `security_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `residentId` INTEGER NOT NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'ANGGOTA',
    `squadKind` VARCHAR(20) NULL,
    `squadName` VARCHAR(100) NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
    `decreeNumber` VARCHAR(100) NULL,
    `decreeDate` DATE NULL,
    `inauguratedOn` DATE NULL,
    `cardNumber` VARCHAR(60) NULL,
    `joinedOn` DATE NULL,
    `extensionDecree` VARCHAR(100) NULL,
    `endedOn` DATE NULL,
    `endReason` VARCHAR(24) NULL,
    `endDecree` VARCHAR(100) NULL,
    `note` VARCHAR(300) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `security_members_villageId_status_idx`(`villageId`, `status`),
    UNIQUE INDEX `security_mem_res_uq`(`villageId`, `residentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `security_equipment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `category` VARCHAR(20) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `condition` VARCHAR(16) NOT NULL DEFAULT 'BELUM_DIPERIKSA',
    `location` VARCHAR(200) NULL,
    `custodian` VARCHAR(150) NULL,
    `inventoryItemId` INTEGER NULL,
    `lastCheckedOn` DATE NULL,
    `note` VARCHAR(300) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `security_equipment_villageId_category_idx`(`villageId`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `security_ronda_groups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `rt` VARCHAR(10) NULL,
    `rw` VARCHAR(10) NULL,
    `hamlet` VARCHAR(100) NULL,
    `postName` VARCHAR(120) NULL,
    `startTime` VARCHAR(5) NOT NULL DEFAULT '22:00',
    `endTime` VARCHAR(5) NOT NULL DEFAULT '04:00',
    `perShift` INTEGER NOT NULL DEFAULT 2,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `note` VARCHAR(300) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `security_ronda_groups_villageId_active_idx`(`villageId`, `active`),
    UNIQUE INDEX `security_grp_name_uq`(`villageId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `security_ronda_people` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `groupId` INTEGER NOT NULL,
    `residentId` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `joinedOn` DATE NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `security_ronda_people_villageId_residentId_idx`(`villageId`, `residentId`),
    UNIQUE INDEX `security_rp_uq`(`groupId`, `residentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `security_ronda_shifts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `groupId` INTEGER NOT NULL,
    `shiftDate` DATE NOT NULL,
    `residentId` INTEGER NOT NULL,
    `attendance` VARCHAR(10) NOT NULL DEFAULT 'PENDING',
    `markedAt` DATETIME(3) NULL,
    `markedById` INTEGER NULL,
    `attendanceNote` VARCHAR(200) NULL,
    `source` VARCHAR(10) NOT NULL DEFAULT 'MANUAL',
    `replacedResidentId` INTEGER NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `security_ronda_shifts_villageId_shiftDate_idx`(`villageId`, `shiftDate`),
    INDEX `security_ronda_shifts_groupId_shiftDate_idx`(`groupId`, `shiftDate`),
    INDEX `security_ronda_shifts_villageId_residentId_shiftDate_idx`(`villageId`, `residentId`, `shiftDate`),
    UNIQUE INDEX `security_shift_uq`(`groupId`, `shiftDate`, `residentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `security_ronda_swaps` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `groupId` INTEGER NOT NULL,
    `shiftId` INTEGER NOT NULL,
    `requesterResidentId` INTEGER NOT NULL,
    `counterpartResidentId` INTEGER NOT NULL,
    `counterpartShiftId` INTEGER NULL,
    `counterpartAgreed` BOOLEAN NOT NULL DEFAULT false,
    `reason` VARCHAR(300) NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'PENDING',
    `decidedAt` DATETIME(3) NULL,
    `decidedById` INTEGER NULL,
    `decisionNote` VARCHAR(300) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `security_ronda_swaps_groupId_status_idx`(`groupId`, `status`),
    INDEX `security_ronda_swaps_shiftId_idx`(`shiftId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `security_ronda_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `groupId` INTEGER NOT NULL,
    `shiftDate` DATE NOT NULL,
    `loggedAt` DATETIME(3) NOT NULL,
    `kind` VARCHAR(8) NOT NULL,
    `description` VARCHAR(1000) NOT NULL,
    `reporter` VARCHAR(150) NULL,
    `eventId` INTEGER NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `security_ronda_logs_groupId_shiftDate_idx`(`groupId`, `shiftDate`),
    INDEX `security_ronda_logs_villageId_loggedAt_idx`(`villageId`, `loggedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `security_mediations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `eventId` INTEGER NOT NULL,
    `scheduledAt` DATETIME(3) NOT NULL,
    `place` VARCHAR(200) NOT NULL,
    `mediator` VARCHAR(150) NOT NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'SCHEDULED',
    `outcome` VARCHAR(16) NULL,
    `agreement` VARCHAR(2000) NULL,
    `referredTo` VARCHAR(200) NULL,
    `documentRef` VARCHAR(150) NULL,
    `note` VARCHAR(500) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `security_mediations_villageId_eventId_idx`(`villageId`, `eventId`),
    INDEX `security_mediations_villageId_scheduledAt_idx`(`villageId`, `scheduledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `security_mediation_parties` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `mediationId` INTEGER NOT NULL,
    `side` VARCHAR(10) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `residentId` INTEGER NULL,
    `isMinor` BOOLEAN NOT NULL DEFAULT false,
    `attended` BOOLEAN NOT NULL DEFAULT false,
    `agrees` BOOLEAN NULL,
    `note` VARCHAR(300) NULL,

    INDEX `security_mediation_parties_mediationId_idx`(`mediationId`),
    INDEX `security_mediation_parties_villageId_residentId_idx`(`villageId`, `residentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `security_followups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `eventId` INTEGER NOT NULL,
    `mediationId` INTEGER NULL,
    `description` VARCHAR(500) NOT NULL,
    `dueOn` DATE NULL,
    `assignee` VARCHAR(150) NULL,
    `status` VARCHAR(8) NOT NULL DEFAULT 'OPEN',
    `doneAt` DATETIME(3) NULL,
    `doneNote` VARCHAR(300) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `security_followups_villageId_eventId_idx`(`villageId`, `eventId`),
    INDEX `security_followups_villageId_status_dueOn_idx`(`villageId`, `status`, `dueOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `security_report_links` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `eventId` INTEGER NOT NULL,
    `citizenReportId` BIGINT NOT NULL,
    `linkedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `security_report_links_villageId_citizenReportId_idx`(`villageId`, `citizenReportId`),
    UNIQUE INDEX `security_rl_uq`(`eventId`, `citizenReportId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `security_risk_areas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `kind` VARCHAR(24) NOT NULL,
    `level` VARCHAR(8) NOT NULL DEFAULT 'MEDIUM',
    `rt` VARCHAR(10) NULL,
    `rw` VARCHAR(10) NULL,
    `hamlet` VARCHAR(100) NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `note` VARCHAR(500) NULL,
    `lastReviewedOn` DATE NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `security_risk_areas_villageId_level_idx`(`villageId`, `level`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `security_contacts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `kind` VARCHAR(20) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(40) NOT NULL,
    `address` VARCHAR(255) NULL,
    `hours` VARCHAR(100) NULL,
    `note` VARCHAR(300) NULL,
    `checkedOn` DATE NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `security_contacts_villageId_kind_idx`(`villageId`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `security_members` ADD CONSTRAINT `security_members_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `security_equipment` ADD CONSTRAINT `security_equipment_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `security_ronda_groups` ADD CONSTRAINT `security_ronda_groups_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `security_ronda_people` ADD CONSTRAINT `security_ronda_people_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `security_ronda_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `security_ronda_shifts` ADD CONSTRAINT `security_ronda_shifts_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `security_ronda_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `security_ronda_swaps` ADD CONSTRAINT `security_ronda_swaps_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `security_ronda_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `security_ronda_swaps` ADD CONSTRAINT `security_ronda_swaps_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `security_ronda_shifts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `security_ronda_logs` ADD CONSTRAINT `security_ronda_logs_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `security_ronda_groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `security_mediations` ADD CONSTRAINT `security_mediations_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `security_mediation_parties` ADD CONSTRAINT `security_mediation_parties_mediationId_fkey` FOREIGN KEY (`mediationId`) REFERENCES `security_mediations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `security_followups` ADD CONSTRAINT `security_followups_mediationId_fkey` FOREIGN KEY (`mediationId`) REFERENCES `security_mediations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `security_risk_areas` ADD CONSTRAINT `security_risk_areas_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `security_contacts` ADD CONSTRAINT `security_contacts_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- Pertahanan berlapis (aplikasi sudah memvalidasi): kamus nilai tertutup, status berakhir/selesai konsisten dengan tanggalnya,
-- jumlah petugas dan jam ronda wajar, koordinat berpasangan. MySQL >= 8.0.16 / MariaDB >= 10.2 menegakkannya; versi lebih lama menerima sintaks ini dan mengabaikannya.
ALTER TABLE `security_members` ADD CONSTRAINT `security_members_enum_chk` CHECK (`role` IN ('KEPALA_SATLINMAS', 'KEPALA_PELAKSANA', 'KOMANDAN_REGU', 'ANGGOTA') AND `status` IN ('ACTIVE', 'ENDED') AND (`squadKind` IS NULL OR `squadKind` IN ('SIAGA_DINI', 'PENGAMANAN', 'PERTOLONGAN_PERTAMA', 'PENYELAMATAN', 'DAPUR_UMUM')));
ALTER TABLE `security_members` ADD CONSTRAINT `security_members_end_chk` CHECK (((`status` = 'ENDED' AND `endedOn` IS NOT NULL AND `endReason` IS NOT NULL) OR (`status` = 'ACTIVE' AND `endedOn` IS NULL AND `endReason` IS NULL)));
ALTER TABLE `security_equipment` ADD CONSTRAINT `security_equipment_chk` CHECK (`quantity` >= 0 AND `condition` IN ('BAIK', 'PERLU_PERBAIKAN', 'RUSAK', 'BELUM_DIPERIKSA'));
ALTER TABLE `security_ronda_groups` ADD CONSTRAINT `security_ronda_groups_chk` CHECK (`perShift` BETWEEN 1 AND 20 AND `startTime` REGEXP '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND `endTime` REGEXP '^([01][0-9]|2[0-3]):[0-5][0-9]$');
ALTER TABLE `security_ronda_shifts` ADD CONSTRAINT `security_ronda_shifts_enum_chk` CHECK (`attendance` IN ('PENDING', 'PRESENT', 'LATE', 'ABSENT', 'EXCUSED') AND `source` IN ('GENERATED', 'MANUAL', 'SWAP'));
ALTER TABLE `security_ronda_swaps` ADD CONSTRAINT `security_ronda_swaps_chk` CHECK (`status` IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'));
ALTER TABLE `security_ronda_logs` ADD CONSTRAINT `security_ronda_logs_chk` CHECK (`kind` IN ('NIHIL', 'TEMUAN'));
ALTER TABLE `security_mediations` ADD CONSTRAINT `security_mediations_chk` CHECK (`status` IN ('SCHEDULED', 'COMPLETED', 'CANCELLED') AND (`outcome` IS NULL OR `outcome` IN ('SEPAKAT', 'SEPAKAT_SEBAGIAN', 'TIDAK_SEPAKAT', 'DITUNDA', 'DIRUJUK')) AND ((`status` = 'COMPLETED') = (`outcome` IS NOT NULL)));
ALTER TABLE `security_mediation_parties` ADD CONSTRAINT `security_mediation_parties_chk` CHECK (`side` IN ('PIHAK_A', 'PIHAK_B', 'SAKSI', 'PENDAMPING'));
ALTER TABLE `security_followups` ADD CONSTRAINT `security_followups_chk` CHECK (`status` IN ('OPEN', 'DONE') AND ((`status` = 'DONE') = (`doneAt` IS NOT NULL)));
ALTER TABLE `security_report_links` ADD CONSTRAINT `security_report_links_chk` CHECK (`citizenReportId` > 0);
ALTER TABLE `security_risk_areas` ADD CONSTRAINT `security_risk_areas_chk` CHECK (`level` IN ('LOW', 'MEDIUM', 'HIGH') AND (`lat` IS NULL) = (`lng` IS NULL) AND (`lat` IS NULL OR (`lat` BETWEEN -90 AND 90 AND `lng` BETWEEN -180 AND 180)));
