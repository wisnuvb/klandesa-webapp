-- Paket 2 / DPPA berversi. ADITIF: 2 kolom pada apbdes_activity_plans (revision, baseVersion) + 1 tabel riwayat DPA/DPPA
-- yang pernah disetujui. Tidak mengubah data lain. Rollback: PHASE2_DPPA_ROLLBACK.sql (riwayat dibuang; DPA tetap).

-- AlterTable
ALTER TABLE `apbdes_activity_plans` ADD COLUMN `baseVersion` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `revision` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `apbdes_activity_plan_versions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `activityCode` VARCHAR(12) NOT NULL,
    `revision` INTEGER NOT NULL,
    `baseVersion` INTEGER NOT NULL,
    `budgetCents` BIGINT NOT NULL,
    `executorName` VARCHAR(150) NULL,
    `rak` JSON NOT NULL,
    `work` JSON NOT NULL,
    `rab` JSON NOT NULL,
    `verifiedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NOT NULL,
    `approvedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `apbdes_activity_plan_versions_villageId_year_activityCode_re_key`(`villageId`, `year`, `activityCode`, `revision`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `apbdes_activity_plan_versions` ADD CONSTRAINT `apbdes_activity_plan_versions_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Isi awal: DPA yang sudah diverifikasi/disetujui sebelum rilis ini dianggap berdasar pada APB Desa versi tertinggi yang
-- sudah ditetapkan saat DPA itu disetujui (diperkirakan dari tanggal ubah dokumen). Draf tidak diubah.
UPDATE `apbdes_activity_plans` p
SET p.`baseVersion` = COALESCE((
    SELECT MAX(d.`version`) FROM `apbdes_documents` d
    WHERE d.`villageId` = p.`villageId` AND d.`year` = p.`year` AND d.`status` = 'DITETAPKAN'
      AND d.`updatedAt` <= COALESCE(p.`approvedAt`, p.`verifiedAt`, p.`updatedAt`)
), 0)
WHERE p.`status` <> 'DRAFT';
