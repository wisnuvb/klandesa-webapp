-- Fase 1 butir 8 (simpan-pinjam koperasi): hanya MENAMBAH tiga tabel baru.
CREATE TABLE `cooperative_savings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cooperativeId` INTEGER NOT NULL,
    `memberId` INTEGER NOT NULL,
    `kind` VARCHAR(10) NOT NULL,
    `direction` VARCHAR(5) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `txDate` DATE NOT NULL,
    `note` VARCHAR(200) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cooperative_savings_cooperativeId_memberId_kind_idx`(`cooperativeId`, `memberId`, `kind`),
    INDEX `cooperative_savings_cooperativeId_txDate_idx`(`cooperativeId`, `txDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `cooperative_loans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cooperativeId` INTEGER NOT NULL,
    `memberId` INTEGER NOT NULL,
    `principal` DECIMAL(15, 2) NOT NULL,
    `ratePercent` DECIMAL(5, 2) NOT NULL,
    `termMonths` INTEGER NOT NULL,
    `disbursedAt` DATE NOT NULL,
    `purpose` VARCHAR(200) NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'AKTIF',
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `cooperative_loans_cooperativeId_memberId_idx`(`cooperativeId`, `memberId`),
    INDEX `cooperative_loans_cooperativeId_status_idx`(`cooperativeId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `cooperative_loan_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `loanId` INTEGER NOT NULL,
    `paidAt` DATE NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `note` VARCHAR(200) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cooperative_loan_payments_loanId_paidAt_idx`(`loanId`, `paidAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `cooperative_savings` ADD CONSTRAINT `cooperative_savings_cooperativeId_fkey` FOREIGN KEY (`cooperativeId`) REFERENCES `cooperatives`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `cooperative_savings` ADD CONSTRAINT `cooperative_savings_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `cooperative_members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `cooperative_loans` ADD CONSTRAINT `cooperative_loans_cooperativeId_fkey` FOREIGN KEY (`cooperativeId`) REFERENCES `cooperatives`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `cooperative_loans` ADD CONSTRAINT `cooperative_loans_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `cooperative_members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `cooperative_loan_payments` ADD CONSTRAINT `cooperative_loan_payments_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `cooperative_loans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
