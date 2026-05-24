-- CreateTable
CREATE TABLE `partner_commission_rules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `partnerId` INTEGER NOT NULL,
    `closingBonusAmount` DECIMAL(15, 2) NOT NULL DEFAULT 500000,
    `subscriptionSharePercent` DECIMAL(5, 2) NOT NULL DEFAULT 10,
    `effectiveFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `partner_commission_rules_partnerId_key`(`partnerId`),
    INDEX `partner_commission_rules_partnerId_isActive_idx`(`partnerId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partner_commission_entries` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `partnerId` INTEGER NOT NULL,
    `villageId` INTEGER NULL,
    `type` VARCHAR(30) NOT NULL,
    `sourceInvoiceId` BIGINT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'IDR',
    `description` TEXT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'accrued',
    `periodStart` DATETIME(3) NULL,
    `periodEnd` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `partner_commission_entries_sourceInvoiceId_key`(`sourceInvoiceId`),
    INDEX `partner_commission_entries_partnerId_status_idx`(`partnerId`, `status`),
    INDEX `partner_commission_entries_partnerId_type_createdAt_idx`(`partnerId`, `type`, `createdAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partner_disbursements` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `partnerId` INTEGER NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'IDR',
    `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
    `bankName` VARCHAR(80) NOT NULL,
    `accountNumber` VARCHAR(40) NOT NULL,
    `accountName` VARCHAR(120) NOT NULL,
    `reference` VARCHAR(120) NULL,
    `paidAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdByPlatformUserId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `partner_disbursements_partnerId_status_idx`(`partnerId`, `status`),
    INDEX `partner_disbursements_partnerId_createdAt_idx`(`partnerId`, `createdAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partner_disbursement_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `disbursementId` BIGINT NOT NULL,
    `commissionEntryId` BIGINT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `partner_disbursement_items_commissionEntryId_key`(`commissionEntryId`),
    INDEX `partner_disbursement_items_disbursementId_idx`(`disbursementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `partner_commission_rules` ADD CONSTRAINT `partner_commission_rules_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_commission_entries` ADD CONSTRAINT `partner_commission_entries_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_commission_entries` ADD CONSTRAINT `partner_commission_entries_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_commission_entries` ADD CONSTRAINT `partner_commission_entries_sourceInvoiceId_fkey` FOREIGN KEY (`sourceInvoiceId`) REFERENCES `billing_invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_disbursements` ADD CONSTRAINT `partner_disbursements_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_disbursements` ADD CONSTRAINT `partner_disbursements_createdByPlatformUserId_fkey` FOREIGN KEY (`createdByPlatformUserId`) REFERENCES `platform_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_disbursement_items` ADD CONSTRAINT `partner_disbursement_items_disbursementId_fkey` FOREIGN KEY (`disbursementId`) REFERENCES `partner_disbursements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_disbursement_items` ADD CONSTRAINT `partner_disbursement_items_commissionEntryId_fkey` FOREIGN KEY (`commissionEntryId`) REFERENCES `partner_commission_entries`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
