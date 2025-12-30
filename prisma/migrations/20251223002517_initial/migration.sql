-- CreateTable
CREATE TABLE `villages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `district` VARCHAR(255) NOT NULL,
    `regency` VARCHAR(255) NOT NULL,
    `province` VARCHAR(255) NOT NULL,
    `address` TEXT NOT NULL,
    `postalCode` VARCHAR(10) NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(255) NULL,
    `website` VARCHAR(255) NULL,
    `logoUrl` TEXT NULL,
    `settings` JSON NULL,
    `subscriptionPlan` VARCHAR(50) NOT NULL DEFAULT 'starter',
    `subscriptionStatus` VARCHAR(50) NOT NULL DEFAULT 'active',
    `subscriptionDate` DATETIME(3) NULL,
    `subscriptionExpiry` DATETIME(3) NULL,
    `storageLimit` INTEGER NOT NULL DEFAULT 1,
    `storageUsed` DOUBLE NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `villages_code_key`(`code`),
    INDEX `villages_code_idx`(`code`),
    INDEX `villages_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `avatar` TEXT NULL,
    `role` VARCHAR(50) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLogin` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_villageId_role_idx`(`villageId`, `role`),
    INDEX `users_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `residents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `nik` VARCHAR(16) NOT NULL,
    `kk` VARCHAR(16) NULL,
    `name` VARCHAR(255) NOT NULL,
    `birthplace` VARCHAR(255) NOT NULL,
    `birthDate` DATETIME(3) NOT NULL,
    `gender` VARCHAR(20) NOT NULL,
    `bloodType` VARCHAR(5) NULL,
    `religion` VARCHAR(50) NOT NULL,
    `maritalStatus` VARCHAR(50) NOT NULL,
    `familyRole` VARCHAR(50) NOT NULL,
    `address` TEXT NOT NULL,
    `rt` VARCHAR(10) NULL,
    `rw` VARCHAR(10) NULL,
    `hamlet` VARCHAR(100) NULL,
    `occupation` VARCHAR(255) NULL,
    `education` VARCHAR(100) NULL,
    `nationality` VARCHAR(50) NOT NULL DEFAULT 'Indonesia',
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(255) NULL,
    `isAlive` BOOLEAN NOT NULL DEFAULT true,
    `moveDate` DATETIME(3) NULL,
    `deathDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `residents_villageId_name_idx`(`villageId`, `name`),
    INDEX `residents_villageId_nik_idx`(`villageId`, `nik`),
    INDEX `residents_villageId_kk_idx`(`villageId`, `kk`),
    UNIQUE INDEX `residents_villageId_nik_key`(`villageId`, `nik`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `positions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `level` INTEGER NOT NULL DEFAULT 1,
    `salary` DOUBLE NULL,
    `allowance` DOUBLE NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `positions_villageId_isActive_idx`(`villageId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `officials` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `positionId` INTEGER NOT NULL,
    `nik` VARCHAR(16) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `birthplace` VARCHAR(255) NOT NULL,
    `birthDate` DATETIME(3) NOT NULL,
    `gender` VARCHAR(20) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(255) NULL,
    `address` TEXT NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `education` VARCHAR(100) NULL,
    `certification` TEXT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `skPengangkatan` TEXT NULL,
    `photoUrl` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `officials_villageId_status_idx`(`villageId`, `status`),
    INDEX `officials_villageId_positionId_idx`(`villageId`, `positionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `requestNumber` VARCHAR(100) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `requesterNik` VARCHAR(16) NOT NULL,
    `requesterName` VARCHAR(255) NOT NULL,
    `requesterPhone` VARCHAR(20) NULL,
    `requesterEmail` VARCHAR(255) NULL,
    `status` VARCHAR(50) NOT NULL,
    `priority` VARCHAR(50) NOT NULL DEFAULT 'medium',
    `response` TEXT NULL,
    `responseDate` DATETIME(3) NULL,
    `respondedBy` INTEGER NULL,
    `attachments` JSON NULL,
    `requestDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `requests_requestNumber_key`(`requestNumber`),
    INDEX `requests_villageId_status_idx`(`villageId`, `status`),
    INDEX `requests_villageId_category_idx`(`villageId`, `category`),
    INDEX `requests_requestNumber_idx`(`requestNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mail_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `templateStructure` JSON NOT NULL,
    `contentTemplate` TEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isGlobal` BOOLEAN NOT NULL DEFAULT false,
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `mail_templates_villageId_isActive_idx`(`villageId`, `isActive`),
    INDEX `mail_templates_category_idx`(`category`),
    INDEX `mail_templates_isGlobal_idx`(`isGlobal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mail_services` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `templateId` INTEGER NOT NULL,
    `templateName` VARCHAR(255) NOT NULL,
    `templateCategory` VARCHAR(100) NOT NULL,
    `letterNumber` VARCHAR(255) NOT NULL,
    `letterDate` DATETIME(3) NOT NULL,
    `applicantName` VARCHAR(255) NOT NULL,
    `applicantNik` VARCHAR(16) NOT NULL,
    `signerRole` VARCHAR(50) NULL,
    `signerName` VARCHAR(255) NULL,
    `formData` JSON NOT NULL,
    `contentHtml` TEXT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'draft',
    `createdBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `printedAt` DATETIME(3) NULL,
    `printCount` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `mail_services_letterNumber_key`(`letterNumber`),
    INDEX `mail_services_villageId_createdAt_idx`(`villageId`, `createdAt` DESC),
    INDEX `mail_services_villageId_applicantNik_idx`(`villageId`, `applicantNik`),
    INDEX `mail_services_villageId_status_idx`(`villageId`, `status`),
    INDEX `mail_services_letterNumber_idx`(`letterNumber`),
    INDEX `mail_services_templateId_idx`(`templateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mail_history` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `mailServiceId` BIGINT NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `changes` JSON NULL,
    `changedBy` INTEGER NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `mail_history_mailServiceId_idx`(`mailServiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mail_attachments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `mailServiceId` BIGINT NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `filePath` VARCHAR(500) NOT NULL,
    `fileType` VARCHAR(50) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `mail_attachments_mailServiceId_idx`(`mailServiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mail_requests` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `requestNumber` VARCHAR(100) NOT NULL,
    `nik` VARCHAR(16) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `mailType` VARCHAR(255) NOT NULL,
    `purpose` TEXT NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `notes` TEXT NULL,
    `rejectionReason` TEXT NULL,
    `requestDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `mail_requests_requestNumber_key`(`requestNumber`),
    INDEX `mail_requests_villageId_status_idx`(`villageId`, `status`),
    INDEX `mail_requests_villageId_nik_idx`(`villageId`, `nik`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `transactionNumber` VARCHAR(100) NOT NULL,
    `transactionDate` DATETIME(3) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `description` TEXT NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `budgetId` BIGINT NULL,
    `paymentMethod` VARCHAR(100) NULL,
    `referenceNumber` VARCHAR(100) NULL,
    `receiptUrl` TEXT NULL,
    `attachments` JSON NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `verifiedBy` INTEGER NULL,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `transactions_transactionNumber_key`(`transactionNumber`),
    INDEX `transactions_villageId_transactionDate_idx`(`villageId`, `transactionDate` DESC),
    INDEX `transactions_villageId_type_category_idx`(`villageId`, `type`, `category`),
    INDEX `transactions_villageId_status_idx`(`villageId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budgets` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `budgetCode` VARCHAR(50) NOT NULL,
    `year` INTEGER NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `subCategory` VARCHAR(100) NULL,
    `budgetAmount` DECIMAL(15, 2) NOT NULL,
    `realizedAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `remainingAmount` DECIMAL(15, 2) NOT NULL,
    `realizationPercent` DOUBLE NOT NULL DEFAULT 0,
    `description` TEXT NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `createdBy` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `budgets_villageId_year_idx`(`villageId`, `year`),
    INDEX `budgets_villageId_category_idx`(`villageId`, `category`),
    UNIQUE INDEX `budgets_villageId_budgetCode_year_key`(`villageId`, `budgetCode`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `potentials` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `subCategory` VARCHAR(100) NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `location` TEXT NULL,
    `area` DOUBLE NULL,
    `productionValue` DECIMAL(15, 2) NULL,
    `productionUnit` VARCHAR(50) NULL,
    `annualIncome` DECIMAL(15, 2) NULL,
    `involvedPeople` INTEGER NULL,
    `images` JSON NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `potentials_villageId_category_idx`(`villageId`, `category`),
    INDEX `potentials_villageId_status_idx`(`villageId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `digital_archives` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `filePath` VARCHAR(500) NOT NULL,
    `fileType` VARCHAR(50) NOT NULL,
    `fileSize` BIGINT NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `subCategory` VARCHAR(100) NULL,
    `year` INTEGER NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `tags` JSON NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `accessLevel` VARCHAR(50) NOT NULL DEFAULT 'admin',
    `uploadedBy` INTEGER NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `downloadCount` INTEGER NOT NULL DEFAULT 0,
    `lastAccessed` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `digital_archives_villageId_category_idx`(`villageId`, `category`),
    INDEX `digital_archives_villageId_year_idx`(`villageId`, `year`),
    INDEX `digital_archives_villageId_isPublic_idx`(`villageId`, `isPublic`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `statistics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `month` INTEGER NULL,
    `totalPopulation` INTEGER NULL,
    `malePopulation` INTEGER NULL,
    `femalePopulation` INTEGER NULL,
    `familyCount` INTEGER NULL,
    `ageGroup0_4` INTEGER NULL,
    `ageGroup5_14` INTEGER NULL,
    `ageGroup15_24` INTEGER NULL,
    `ageGroup25_54` INTEGER NULL,
    `ageGroup55Plus` INTEGER NULL,
    `educationSD` INTEGER NULL,
    `educationSMP` INTEGER NULL,
    `educationSMA` INTEGER NULL,
    `educationDiploma` INTEGER NULL,
    `educationS1Plus` INTEGER NULL,
    `occupationFarmer` INTEGER NULL,
    `occupationMerchant` INTEGER NULL,
    `occupationEmployee` INTEGER NULL,
    `occupationOther` INTEGER NULL,
    `religionIslam` INTEGER NULL,
    `religionKristen` INTEGER NULL,
    `religionKatolik` INTEGER NULL,
    `religionHindu` INTEGER NULL,
    `religionBuddha` INTEGER NULL,
    `religionKonghucu` INTEGER NULL,
    `totalMailServices` INTEGER NULL,
    `totalRequests` INTEGER NULL,
    `completedRequests` INTEGER NULL,
    `totalIncome` DECIMAL(15, 2) NULL,
    `totalExpense` DECIMAL(15, 2) NULL,
    `additionalData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `statistics_villageId_year_idx`(`villageId`, `year`),
    UNIQUE INDEX `statistics_villageId_year_month_key`(`villageId`, `year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `announcements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `imageUrl` TEXT NULL,
    `isPinned` BOOLEAN NOT NULL DEFAULT false,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `publishDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiryDate` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `announcements_villageId_isActive_publishDate_idx`(`villageId`, `isActive`, `publishDate` DESC),
    INDEX `announcements_villageId_category_idx`(`villageId`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `website_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `previewImage` TEXT NOT NULL,
    `thumbnailUrl` TEXT NOT NULL,
    `demoUrl` TEXT NULL,
    `structure` JSON NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `subscriptionType` VARCHAR(50) NOT NULL,
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `rating` DOUBLE NOT NULL DEFAULT 0,
    `reviewCount` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `website_templates_isActive_isFeatured_idx`(`isActive`, `isFeatured`),
    INDEX `website_templates_category_idx`(`category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `website_subscriptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NOT NULL,
    `templateId` INTEGER NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `expiryDate` DATETIME(3) NOT NULL,
    `customization` JSON NULL,
    `customDomain` VARCHAR(255) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `website_subscriptions_villageId_key`(`villageId`),
    INDEX `website_subscriptions_villageId_idx`(`villageId`),
    INDEX `website_subscriptions_templateId_idx`(`templateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `villageId` INTEGER NULL,
    `userId` INTEGER NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity` VARCHAR(100) NOT NULL,
    `entityId` VARCHAR(100) NULL,
    `changes` JSON NULL,
    `metadata` JSON NULL,
    `ipAddress` VARCHAR(50) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_villageId_createdAt_idx`(`villageId`, `createdAt` DESC),
    INDEX `audit_logs_userId_createdAt_idx`(`userId`, `createdAt` DESC),
    INDEX `audit_logs_entity_entityId_idx`(`entity`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `residents` ADD CONSTRAINT `residents_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `positions` ADD CONSTRAINT `positions_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `officials` ADD CONSTRAINT `officials_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `officials` ADD CONSTRAINT `officials_positionId_fkey` FOREIGN KEY (`positionId`) REFERENCES `positions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requests` ADD CONSTRAINT `requests_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `requests` ADD CONSTRAINT `requests_respondedBy_fkey` FOREIGN KEY (`respondedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mail_templates` ADD CONSTRAINT `mail_templates_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mail_services` ADD CONSTRAINT `mail_services_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mail_services` ADD CONSTRAINT `mail_services_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `mail_templates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mail_services` ADD CONSTRAINT `mail_services_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mail_history` ADD CONSTRAINT `mail_history_mailServiceId_fkey` FOREIGN KEY (`mailServiceId`) REFERENCES `mail_services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mail_history` ADD CONSTRAINT `mail_history_changedBy_fkey` FOREIGN KEY (`changedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mail_attachments` ADD CONSTRAINT `mail_attachments_mailServiceId_fkey` FOREIGN KEY (`mailServiceId`) REFERENCES `mail_services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mail_requests` ADD CONSTRAINT `mail_requests_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_budgetId_fkey` FOREIGN KEY (`budgetId`) REFERENCES `budgets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `potentials` ADD CONSTRAINT `potentials_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `digital_archives` ADD CONSTRAINT `digital_archives_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `statistics` ADD CONSTRAINT `statistics_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `website_subscriptions` ADD CONSTRAINT `website_subscriptions_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `website_templates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
