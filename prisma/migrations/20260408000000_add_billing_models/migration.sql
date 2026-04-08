-- CreateTable
CREATE TABLE `billing_invoices` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `invoiceNumber` VARCHAR(100) NOT NULL,
    `provider` VARCHAR(30) NOT NULL DEFAULT 'LINKQU',
    `partnerReff` VARCHAR(100) NOT NULL,
    `productType` VARCHAR(50) NOT NULL,
    `planCode` VARCHAR(50) NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'IDR',
    `amount` DECIMAL(15, 2) NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
    `paymentMethod` VARCHAR(30) NULL,
    `bankCode` VARCHAR(30) NULL,
    `retailCode` VARCHAR(30) NULL,
    `paymentUrl` TEXT NULL,
    `qrContent` TEXT NULL,
    `qrImageUrl` TEXT NULL,
    `vaNumber` VARCHAR(80) NULL,
    `externalTransactionId` VARCHAR(120) NULL,
    `expiresAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `rawResponse` JSON NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `billing_invoices_invoiceNumber_key`(`invoiceNumber`),
    UNIQUE INDEX `billing_invoices_partnerReff_key`(`partnerReff`),
    INDEX `billing_invoices_villageId_createdAt_idx`(`villageId`, `createdAt` DESC),
    INDEX `billing_invoices_villageId_status_idx`(`villageId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `billing_invoice_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `invoiceId` BIGINT NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unitAmount` DECIMAL(15, 2) NOT NULL,
    `totalAmount` DECIMAL(15, 2) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `billing_invoice_items_invoiceId_idx`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `billing_payment_events` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `invoiceId` BIGINT NOT NULL,
    `provider` VARCHAR(30) NOT NULL DEFAULT 'LINKQU',
    `eventType` VARCHAR(50) NOT NULL DEFAULT 'callback',
    `partnerReff` VARCHAR(100) NULL,
    `transactionId` VARCHAR(120) NULL,
    `status` VARCHAR(50) NULL,
    `signatureValid` BOOLEAN NOT NULL DEFAULT false,
    `payload` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `billing_payment_events_provider_partnerReff_transactionId_key`(`provider`, `partnerReff`, `transactionId`),
    INDEX `billing_payment_events_invoiceId_createdAt_idx`(`invoiceId`, `createdAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `billing_invoices` ADD CONSTRAINT `billing_invoices_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `billing_invoice_items` ADD CONSTRAINT `billing_invoice_items_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `billing_invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `billing_payment_events` ADD CONSTRAINT `billing_payment_events_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `billing_invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

