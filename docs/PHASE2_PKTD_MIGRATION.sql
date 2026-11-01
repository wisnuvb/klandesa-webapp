-- Paket 2 / P2.f: Padat Karya Tunai Desa. ADITIF: tiga tabel baru, tanpa mengubah tabel lama. Rollback: PHASE2_PKTD_ROLLBACK.sql.

-- CreateTable
CREATE TABLE `pktd_activities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `activityCode` VARCHAR(12) NULL,
    `title` VARCHAR(200) NOT NULL,
    `location` VARCHAR(200) NULL,
    `startDate` DATE NULL,
    `endDate` DATE NULL,
    `costCents` BIGINT NOT NULL,
    `plannedWageCents` BIGINT NOT NULL DEFAULT 0,
    `wageMinCents` BIGINT NULL,
    `wageMaxCents` BIGINT NULL,
    `wageBasis` VARCHAR(200) NULL,
    `status` VARCHAR(8) NOT NULL DEFAULT 'AKTIF',
    `note` VARCHAR(500) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `pktd_activities_villageId_year_idx`(`villageId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pktd_workers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `activityId` INTEGER NOT NULL,
    `villageId` INTEGER NOT NULL,
    `residentId` INTEGER NULL,
    `name` VARCHAR(255) NOT NULL,
    `gender` VARCHAR(1) NULL,
    `priority` VARCHAR(20) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pktd_workers_villageId_idx`(`villageId`),
    UNIQUE INDEX `pktd_workers_activity_resident`(`activityId`, `residentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pktd_work_days` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `activityId` INTEGER NOT NULL,
    `villageId` INTEGER NOT NULL,
    `workerId` INTEGER NOT NULL,
    `workDate` DATE NOT NULL,
    `task` VARCHAR(16) NOT NULL,
    `wageCents` BIGINT NOT NULL,
    `paidOn` DATE NULL,
    `note` VARCHAR(200) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pktd_work_days_activityId_workDate_idx`(`activityId`, `workDate`),
    UNIQUE INDEX `pktd_work_days_worker_date`(`workerId`, `workDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pktd_activities` ADD CONSTRAINT `pktd_activities_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pktd_workers` ADD CONSTRAINT `pktd_workers_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `pktd_activities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pktd_workers` ADD CONSTRAINT `pktd_workers_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `residents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pktd_work_days` ADD CONSTRAINT `pktd_work_days_activityId_fkey` FOREIGN KEY (`activityId`) REFERENCES `pktd_activities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pktd_work_days` ADD CONSTRAINT `pktd_work_days_workerId_fkey` FOREIGN KEY (`workerId`) REFERENCES `pktd_workers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
