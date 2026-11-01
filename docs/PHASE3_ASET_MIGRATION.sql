-- Paket 3 / Tanah kas desa dan pemanfaatan aset + Pesanan produk UKM. ADITIF: 6 tabel baru (land_parcels, land_agreements,
-- land_charges, land_agreement_docs, ukm_order_requests, ukm_order_events) dengan kunci asing ke villages, inventory_items, potentials.
-- Tidak mengubah kolom atau data tabel lama. Penerimaan sewa ditulis ke apbdes_entries oleh KODE (fungsi buku kas), bukan oleh SQL ini.
-- CHECK constraint di akhir berkas tidak terlihat oleh `prisma migrate diff` (Prisma tidak memodelkannya); jangan dihapus.
-- Rollback: PHASE3_ASET_ROLLBACK.sql (membuang keenam tabel; data sewa/pesanan hilang, buku kas tetap utuh).

-- CreateTable
CREATE TABLE `land_parcels` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `itemId` INTEGER NOT NULL,
    `areaSqm` DECIMAL(14, 2) NOT NULL,
    `address` VARCHAR(255) NULL,
    `boundaryNorth` VARCHAR(200) NULL,
    `boundaryEast` VARCHAR(200) NULL,
    `boundarySouth` VARCHAR(200) NULL,
    `boundaryWest` VARCHAR(200) NULL,
    `rightKind` VARCHAR(12) NOT NULL,
    `rightNumber` VARCHAR(80) NULL,
    `rightHolder` VARCHAR(150) NULL,
    `rightIssuedOn` DATE NULL,
    `persilNo` VARCHAR(40) NULL,
    `letterCNo` VARCHAR(40) NULL,
    `usage` VARCHAR(20) NOT NULL DEFAULT 'TIDAK_DIMANFAATKAN',
    `usageNote` VARCHAR(300) NULL,
    `notes` VARCHAR(500) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `land_parcels_itemId_key`(`itemId`),
    INDEX `land_parcels_villageId_usage_idx`(`villageId`, `usage`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `land_agreements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `itemId` INTEGER NOT NULL,
    `kind` VARCHAR(10) NOT NULL,
    `status` VARCHAR(8) NOT NULL DEFAULT 'DRAF',
    `agreementNo` VARCHAR(100) NULL,
    `signedOn` DATE NULL,
    `lesseeName` VARCHAR(150) NOT NULL,
    `lesseeKind` VARCHAR(10) NOT NULL,
    `lesseeAddress` VARCHAR(255) NULL,
    `lesseeContact` VARCHAR(40) NULL,
    `purpose` VARCHAR(200) NULL,
    `objectNote` VARCHAR(300) NULL,
    `leasedAreaSqm` DECIMAL(14, 2) NULL,
    `startOn` DATE NOT NULL,
    `endOn` DATE NOT NULL,
    `periodUnit` VARCHAR(6) NOT NULL,
    `amountCents` BIGINT NOT NULL,
    `accountCode` VARCHAR(14) NOT NULL,
    `tenantDuties` VARCHAR(500) NOT NULL,
    `forceMajeureIncluded` BOOLEAN NOT NULL DEFAULT false,
    `otherTerms` VARCHAR(1000) NULL,
    `perdesNo` VARCHAR(100) NULL,
    `perdesDate` DATE NULL,
    `regencyPermitNo` VARCHAR(100) NULL,
    `regencyPermitDate` DATE NULL,
    `appraisalRef` VARCHAR(150) NULL,
    `activatedAt` DATETIME(3) NULL,
    `activatedById` INTEGER NULL,
    `endedOn` DATE NULL,
    `endedReason` VARCHAR(300) NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `land_agreements_villageId_status_endOn_idx`(`villageId`, `status`, `endOn`),
    INDEX `land_agreements_itemId_status_idx`(`itemId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `land_charges` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `agreementId` INTEGER NOT NULL,
    `seq` INTEGER NOT NULL,
    `dueOn` DATE NOT NULL,
    `amountCents` BIGINT NOT NULL,
    `status` VARCHAR(8) NOT NULL DEFAULT 'BELUM',
    `receivedOn` DATE NULL,
    `channel` VARCHAR(5) NULL,
    `voucherNo` VARCHAR(60) NULL,
    `entryId` INTEGER NULL,
    `receivedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `land_charges_entryId_key`(`entryId`),
    INDEX `land_charges_villageId_status_dueOn_idx`(`villageId`, `status`, `dueOn`),
    UNIQUE INDEX `land_charges_agreementId_seq_key`(`agreementId`, `seq`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `land_agreement_docs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `agreementId` INTEGER NOT NULL,
    `kind` VARCHAR(12) NOT NULL,
    `archiveId` BIGINT NOT NULL,
    `label` VARCHAR(150) NOT NULL,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `land_agreement_docs_agreementId_archiveId_key`(`agreementId`, `archiveId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ukm_order_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `productId` INTEGER NULL,
    `productName` VARCHAR(255) NOT NULL,
    `unitPriceCents` BIGINT NULL,
    `unit` VARCHAR(50) NULL,
    `quantity` INTEGER NOT NULL,
    `buyerResidentId` INTEGER NOT NULL,
    `sellerResidentId` INTEGER NULL,
    `buyerNote` VARCHAR(300) NULL,
    `sellerNote` VARCHAR(300) NULL,
    `status` VARCHAR(12) NOT NULL DEFAULT 'DIMINTA',
    `activeKey` VARCHAR(40) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ukm_order_requests_activeKey_key`(`activeKey`),
    INDEX `ukm_order_requests_villageId_status_createdAt_idx`(`villageId`, `status`, `createdAt`),
    INDEX `ukm_order_requests_villageId_sellerResidentId_status_idx`(`villageId`, `sellerResidentId`, `status`),
    INDEX `ukm_order_requests_villageId_buyerResidentId_createdAt_idx`(`villageId`, `buyerResidentId`, `createdAt`),
    INDEX `ukm_order_requests_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ukm_order_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `orderId` INTEGER NOT NULL,
    `fromStatus` VARCHAR(12) NULL,
    `toStatus` VARCHAR(12) NOT NULL,
    `actorKind` VARCHAR(8) NOT NULL,
    `note` VARCHAR(300) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ukm_order_events_orderId_createdAt_idx`(`orderId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `land_parcels` ADD CONSTRAINT `land_parcels_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `land_parcels` ADD CONSTRAINT `land_parcels_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `land_agreements` ADD CONSTRAINT `land_agreements_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `land_agreements` ADD CONSTRAINT `land_agreements_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `land_charges` ADD CONSTRAINT `land_charges_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `land_charges` ADD CONSTRAINT `land_charges_agreementId_fkey` FOREIGN KEY (`agreementId`) REFERENCES `land_agreements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `land_agreement_docs` ADD CONSTRAINT `land_agreement_docs_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `land_agreement_docs` ADD CONSTRAINT `land_agreement_docs_agreementId_fkey` FOREIGN KEY (`agreementId`) REFERENCES `land_agreements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ukm_order_requests` ADD CONSTRAINT `ukm_order_requests_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ukm_order_requests` ADD CONSTRAINT `ukm_order_requests_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `potentials`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ukm_order_events` ADD CONSTRAINT `ukm_order_events_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `ukm_order_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Invarian penting (CHECK)
ALTER TABLE `land_parcels` ADD CONSTRAINT `land_parcels_area_chk` CHECK (`areaSqm` > 0);
ALTER TABLE `land_agreements` ADD CONSTRAINT `land_agreements_term_chk` CHECK (`endOn` > `startOn`);
ALTER TABLE `land_agreements` ADD CONSTRAINT `land_agreements_amount_chk` CHECK (`amountCents` > 0);
ALTER TABLE `land_agreements` ADD CONSTRAINT `land_agreements_kind_chk` CHECK (`kind` IN ('SEWA', 'KERJASAMA', 'BGS_BSG'));
ALTER TABLE `land_agreements` ADD CONSTRAINT `land_agreements_status_chk` CHECK (`status` IN ('DRAF', 'AKTIF', 'SELESAI', 'BATAL'));
ALTER TABLE `land_agreements` ADD CONSTRAINT `land_agreements_period_chk` CHECK (`periodUnit` IN ('BULAN', 'TAHUN', 'SEKALI'));
ALTER TABLE `land_charges` ADD CONSTRAINT `land_charges_amount_chk` CHECK (`amountCents` > 0);
ALTER TABLE `land_charges` ADD CONSTRAINT `land_charges_seq_chk` CHECK (`seq` >= 1);
ALTER TABLE `land_charges` ADD CONSTRAINT `land_charges_status_chk` CHECK (`status` IN ('BELUM', 'DITERIMA', 'BATAL'));
ALTER TABLE `ukm_order_requests` ADD CONSTRAINT `ukm_order_requests_qty_chk` CHECK (`quantity` BETWEEN 1 AND 999);
ALTER TABLE `ukm_order_requests` ADD CONSTRAINT `ukm_order_requests_status_chk` CHECK (`status` IN ('DIMINTA', 'DIKONFIRMASI', 'SELESAI', 'DIBATALKAN'));
-- Kunci "satu pesanan terbuka per pembeli per produk" hanya boleh terisi selama pesanan terbuka.
ALTER TABLE `ukm_order_requests` ADD CONSTRAINT `ukm_order_requests_activekey_chk` CHECK (`activeKey` IS NULL OR `status` IN ('DIMINTA', 'DIKONFIRMASI'));
ALTER TABLE `ukm_order_requests` ADD CONSTRAINT `ukm_order_requests_price_chk` CHECK (`unitPriceCents` IS NULL OR `unitPriceCents` > 0);
