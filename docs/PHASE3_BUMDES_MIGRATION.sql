-- Paket 3 / BUMDes inti: koreksi transaksi kas berjejak, jurnal berpasangan, penutupan periode semester, legalitas dan pengurus,
-- serta arus penyertaan modal/bagi hasil dengan APB Desa. ADITIF: 9 tabel baru (awalan bumdes_) dan 7 kolom + 1 indeks pada bumdes_transactions
-- (semua kolom baru berbawaan/NULL, data lama tidak berubah). Rollback: PHASE3_BUMDES_ROLLBACK.sql.

-- AlterTable
ALTER TABLE `bumdes_transactions` ADD COLUMN `accountCode` VARCHAR(10) NULL,
    ADD COLUMN `cashAccountCode` VARCHAR(10) NULL,
    ADD COLUMN `revision` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `status` VARCHAR(12) NOT NULL DEFAULT 'AKTIF',
    ADD COLUMN `voidReason` VARCHAR(300) NULL,
    ADD COLUMN `voidedAt` DATETIME(3) NULL,
    ADD COLUMN `voidedById` INTEGER NULL;

-- CreateTable
CREATE TABLE `bumdes_transaction_revisions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transactionId` INTEGER NOT NULL,
    `revision` INTEGER NOT NULL,
    `action` VARCHAR(8) NOT NULL,
    `reason` VARCHAR(300) NOT NULL,
    `before` JSON NOT NULL,
    `after` JSON NULL,
    `byUserId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `bumdes_transaction_revisions_transactionId_revision_key`(`transactionId`, `revision`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bumdes_journals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bumdesId` INTEGER NOT NULL,
    `unitId` INTEGER NULL,
    `entryDate` DATE NOT NULL,
    `year` INTEGER NOT NULL,
    `seq` INTEGER NOT NULL,
    `voucherNo` VARCHAR(60) NOT NULL,
    `description` VARCHAR(300) NOT NULL,
    `reference` VARCHAR(100) NULL,
    `source` VARCHAR(12) NOT NULL DEFAULT 'MANUAL',
    `transactionId` INTEGER NULL,
    `correctsId` INTEGER NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'AKTIF',
    `voidedAt` DATETIME(3) NULL,
    `voidedById` INTEGER NULL,
    `voidReason` VARCHAR(300) NULL,
    `totalDebitCents` BIGINT NOT NULL,
    `totalCreditCents` BIGINT NOT NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bumdes_journals_bumdesId_entryDate_id_idx`(`bumdesId`, `entryDate`, `id`),
    INDEX `bumdes_journals_bumdesId_unitId_entryDate_idx`(`bumdesId`, `unitId`, `entryDate`),
    INDEX `bumdes_journals_transactionId_idx`(`transactionId`),
    UNIQUE INDEX `bumdes_journals_bumdesId_year_seq_key`(`bumdesId`, `year`, `seq`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bumdes_journal_lines` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `journalId` INTEGER NOT NULL,
    `lineNo` INTEGER NOT NULL,
    `accountCode` VARCHAR(10) NOT NULL,
    `debitCents` BIGINT NOT NULL DEFAULT 0,
    `creditCents` BIGINT NOT NULL DEFAULT 0,
    `memo` VARCHAR(200) NULL,

    INDEX `bumdes_journal_lines_accountCode_idx`(`accountCode`),
    UNIQUE INDEX `bumdes_journal_lines_journalId_lineNo_key`(`journalId`, `lineNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bumdes_period_closes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bumdesId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `half` INTEGER NOT NULL,
    `closedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closedById` INTEGER NULL,
    `profitCents` BIGINT NOT NULL,
    `assetCents` BIGINT NOT NULL,

    UNIQUE INDEX `bumdes_period_closes_bumdesId_year_half_key`(`bumdesId`, `year`, `half`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bumdes_period_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bumdesId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `half` INTEGER NOT NULL,
    `action` VARCHAR(8) NOT NULL,
    `reason` VARCHAR(300) NULL,
    `byUserId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bumdes_period_logs_bumdesId_year_half_idx`(`bumdesId`, `year`, `half`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bumdes_legal_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bumdesId` INTEGER NOT NULL,
    `legalStatus` VARCHAR(14) NOT NULL DEFAULT 'BELUM_DAFTAR',
    `establishMeetingId` INTEGER NULL,
    `establishedOn` DATE NULL,
    `perdesNumber` VARCHAR(100) NULL,
    `perdesDate` DATE NULL,
    `artNumber` VARCHAR(100) NULL,
    `artDate` DATE NULL,
    `nameApprovalNo` VARCHAR(100) NULL,
    `nameApprovalDate` DATE NULL,
    `certificateNo` VARCHAR(100) NULL,
    `certificateDate` DATE NULL,
    `nib` VARCHAR(13) NULL,
    `npwp` VARCHAR(16) NULL,
    `businessFields` VARCHAR(500) NULL,
    `initialCapitalCents` BIGINT NULL,
    `rankingYear` INTEGER NULL,
    `rankingLevel` VARCHAR(1) NULL,
    `note` VARCHAR(500) NULL,
    `updatedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bumdes_legal_profiles_bumdesId_key`(`bumdesId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bumdes_officers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bumdesId` INTEGER NOT NULL,
    `role` VARCHAR(24) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `skNumber` VARCHAR(100) NULL,
    `skDate` DATE NULL,
    `startOn` DATE NULL,
    `endOn` DATE NULL,
    `note` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bumdes_officers_bumdesId_role_idx`(`bumdesId`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bumdes_village_flows` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bumdesId` INTEGER NOT NULL,
    `kind` VARCHAR(16) NOT NULL,
    `fiscalYear` INTEGER NULL,
    `flowDate` DATE NOT NULL,
    `amountCents` BIGINT NOT NULL,
    `resolutionId` INTEGER NOT NULL,
    `musdesMeetingId` INTEGER NOT NULL,
    `cashAccountCode` VARCHAR(10) NOT NULL,
    `apbdesYear` INTEGER NOT NULL,
    `apbdesEntryId` INTEGER NULL,
    `journalId` INTEGER NULL,
    `reference` VARCHAR(150) NULL,
    `note` VARCHAR(300) NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'AKTIF',
    `voidedAt` DATETIME(3) NULL,
    `voidedById` INTEGER NULL,
    `voidReason` VARCHAR(300) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bumdes_village_flows_bumdesId_kind_flowDate_idx`(`bumdesId`, `kind`, `flowDate`),
    INDEX `bumdes_village_flows_apbdesEntryId_idx`(`apbdesEntryId`),
    INDEX `bumdes_village_flows_resolutionId_idx`(`resolutionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bumdes_musdes_resolutions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bumdesId` INTEGER NOT NULL,
    `kind` VARCHAR(16) NOT NULL,
    `musdesMeetingId` INTEGER NOT NULL,
    `decisionId` INTEGER NOT NULL,
    `fiscalYear` INTEGER NULL,
    `amountCents` BIGINT NOT NULL,
    `note` VARCHAR(300) NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'AKTIF',
    `voidedAt` DATETIME(3) NULL,
    `voidedById` INTEGER NULL,
    `voidReason` VARCHAR(300) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bumdes_musdes_resolutions_bumdesId_kind_idx`(`bumdesId`, `kind`),
    INDEX `bumdes_musdes_resolutions_musdesMeetingId_idx`(`musdesMeetingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `bumdes_transactions_bumdesId_status_idx` ON `bumdes_transactions`(`bumdesId`, `status`);

-- AddForeignKey
ALTER TABLE `bumdes_transaction_revisions` ADD CONSTRAINT `bumdes_transaction_revisions_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `bumdes_transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bumdes_journals` ADD CONSTRAINT `bumdes_journals_bumdesId_fkey` FOREIGN KEY (`bumdesId`) REFERENCES `bumdes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bumdes_journals` ADD CONSTRAINT `bumdes_journals_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `bumdes_units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bumdes_journals` ADD CONSTRAINT `bumdes_journals_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `bumdes_transactions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bumdes_journal_lines` ADD CONSTRAINT `bumdes_journal_lines_journalId_fkey` FOREIGN KEY (`journalId`) REFERENCES `bumdes_journals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bumdes_period_closes` ADD CONSTRAINT `bumdes_period_closes_bumdesId_fkey` FOREIGN KEY (`bumdesId`) REFERENCES `bumdes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bumdes_period_logs` ADD CONSTRAINT `bumdes_period_logs_bumdesId_fkey` FOREIGN KEY (`bumdesId`) REFERENCES `bumdes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bumdes_legal_profiles` ADD CONSTRAINT `bumdes_legal_profiles_bumdesId_fkey` FOREIGN KEY (`bumdesId`) REFERENCES `bumdes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bumdes_officers` ADD CONSTRAINT `bumdes_officers_bumdesId_fkey` FOREIGN KEY (`bumdesId`) REFERENCES `bumdes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bumdes_village_flows` ADD CONSTRAINT `bumdes_village_flows_bumdesId_fkey` FOREIGN KEY (`bumdesId`) REFERENCES `bumdes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bumdes_village_flows` ADD CONSTRAINT `bumdes_village_flows_resolutionId_fkey` FOREIGN KEY (`resolutionId`) REFERENCES `bumdes_musdes_resolutions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bumdes_village_flows` ADD CONSTRAINT `bumdes_village_flows_journalId_fkey` FOREIGN KEY (`journalId`) REFERENCES `bumdes_journals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bumdes_musdes_resolutions` ADD CONSTRAINT `bumdes_musdes_resolutions_bumdesId_fkey` FOREIGN KEY (`bumdesId`) REFERENCES `bumdes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- Pertahanan berlapis (aplikasi sudah memvalidasi): jurnal berpasangan (debit = kredit), satu sisi per baris, status, jumlah positif.
-- MySQL >= 8.0.16 / MariaDB >= 10.2 menegakkannya; versi lebih lama menerima sintaks ini dan mengabaikannya.
-- Catatan: jumlah baris jurnal = total header tidak dapat diperiksa CHECK (lintas baris); dijaga servis dalam satu transaksi dan diuji.
ALTER TABLE `bumdes_transactions` ADD CONSTRAINT `bumdes_transactions_status_chk` CHECK (`status` IN ('AKTIF', 'DIBATALKAN'));
ALTER TABLE `bumdes_transactions` ADD CONSTRAINT `bumdes_transactions_void_chk` CHECK ((`status` = 'AKTIF' AND `voidedAt` IS NULL) OR (`status` = 'DIBATALKAN' AND `voidedAt` IS NOT NULL AND `voidReason` IS NOT NULL));
ALTER TABLE `bumdes_transaction_revisions` ADD CONSTRAINT `bumdes_transaction_revisions_action_chk` CHECK (`action` IN ('UBAH', 'BATAL'));
ALTER TABLE `bumdes_journals` ADD CONSTRAINT `bumdes_journals_balanced_chk` CHECK (`totalDebitCents` = `totalCreditCents` AND `totalDebitCents` > 0);
ALTER TABLE `bumdes_journals` ADD CONSTRAINT `bumdes_journals_status_chk` CHECK (`status` IN ('AKTIF', 'DIBATALKAN'));
ALTER TABLE `bumdes_journals` ADD CONSTRAINT `bumdes_journals_source_chk` CHECK (`source` IN ('MANUAL', 'SALDO_AWAL', 'KAS', 'MODAL', 'BAGI_HASIL'));
ALTER TABLE `bumdes_journals` ADD CONSTRAINT `bumdes_journals_void_chk` CHECK ((`status` = 'AKTIF' AND `voidedAt` IS NULL) OR (`status` = 'DIBATALKAN' AND `voidedAt` IS NOT NULL));
ALTER TABLE `bumdes_journal_lines` ADD CONSTRAINT `bumdes_journal_lines_side_chk` CHECK ((`debitCents` > 0 AND `creditCents` = 0) OR (`debitCents` = 0 AND `creditCents` > 0));
ALTER TABLE `bumdes_period_closes` ADD CONSTRAINT `bumdes_period_closes_half_chk` CHECK (`half` IN (1, 2));
ALTER TABLE `bumdes_period_logs` ADD CONSTRAINT `bumdes_period_logs_action_chk` CHECK (`action` IN ('TUTUP', 'BUKA'));
ALTER TABLE `bumdes_village_flows` ADD CONSTRAINT `bumdes_village_flows_amount_chk` CHECK (`amountCents` > 0);
ALTER TABLE `bumdes_village_flows` ADD CONSTRAINT `bumdes_village_flows_kind_chk` CHECK (`kind` IN ('PENYERTAAN_MODAL', 'BAGI_HASIL'));
ALTER TABLE `bumdes_village_flows` ADD CONSTRAINT `bumdes_village_flows_status_chk` CHECK (`status` IN ('AKTIF', 'DIBATALKAN'));
ALTER TABLE `bumdes_musdes_resolutions` ADD CONSTRAINT `bumdes_musdes_resolutions_amount_chk` CHECK (`amountCents` > 0);
ALTER TABLE `bumdes_musdes_resolutions` ADD CONSTRAINT `bumdes_musdes_resolutions_kind_chk` CHECK (`kind` IN ('PENYERTAAN_MODAL', 'BAGI_HASIL'));
ALTER TABLE `bumdes_musdes_resolutions` ADD CONSTRAINT `bumdes_musdes_resolutions_status_chk` CHECK (`status` IN ('AKTIF', 'DIBATALKAN'));
