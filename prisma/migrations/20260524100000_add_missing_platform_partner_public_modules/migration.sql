-- Bring the migration history in sync with the current Prisma schema.
-- These tables/columns existed in schema.prisma but were not represented in earlier migrations.

ALTER TABLE `announcements` ADD COLUMN `createdById` INTEGER NULL;

ALTER TABLE `mail_requests`
  ADD COLUMN `channel` VARCHAR(50) NOT NULL DEFAULT 'portal',
  ADD COLUMN `kioskDeviceId` BIGINT NULL;

ALTER TABLE `officials` ADD COLUMN `supervisorId` INTEGER NULL;

ALTER TABLE `potentials`
  ADD COLUMN `productNotes` TEXT NULL,
  ADD COLUMN `stockQuantity` INTEGER NULL;

ALTER TABLE `users` ADD COLUMN `aiCredits` INTEGER NOT NULL DEFAULT 0;

ALTER TABLE `villages`
  ADD COLUMN `acquiredAt` DATETIME(3) NULL,
  ADD COLUMN `acquiredByPartnerId` INTEGER NULL,
  ADD COLUMN `acquisitionSource` VARCHAR(50) NULL;

CREATE TABLE `platform_users` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'platform_admin',
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `lastLogin` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `platform_users_email_key`(`email`),
  INDEX `platform_users_email_idx`(`email`),
  INDEX `platform_users_role_idx`(`role`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `admin_notifications` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `villageId` INTEGER NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `body` TEXT NULL,
  `href` VARCHAR(500) NULL,
  `sourceKey` VARCHAR(120) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `admin_notifications_villageId_createdAt_idx`(`villageId`, `createdAt` DESC),
  UNIQUE INDEX `admin_notifications_villageId_sourceKey_key`(`villageId`, `sourceKey`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `notification_reads` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `notificationId` INTEGER NOT NULL,
  `userId` INTEGER NOT NULL,
  `readAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `notification_reads_userId_idx`(`userId`),
  UNIQUE INDEX `notification_reads_notificationId_userId_key`(`notificationId`, `userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `forum_threads` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `villageId` INTEGER NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  `isPinned` BOOLEAN NOT NULL DEFAULT false,
  `isLocked` BOOLEAN NOT NULL DEFAULT false,
  `likesCount` INTEGER NOT NULL DEFAULT 0,
  `viewsCount` INTEGER NOT NULL DEFAULT 0,
  `createdBy` INTEGER NULL,
  `createdByName` VARCHAR(255) NOT NULL,
  `createdByRole` VARCHAR(100) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `forum_threads_villageId_createdAt_idx`(`villageId`, `createdAt` DESC),
  INDEX `forum_threads_villageId_category_idx`(`villageId`, `category`),
  INDEX `forum_threads_villageId_status_idx`(`villageId`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `forum_replies` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `threadId` BIGINT NOT NULL,
  `villageId` INTEGER NOT NULL,
  `content` TEXT NOT NULL,
  `likesCount` INTEGER NOT NULL DEFAULT 0,
  `createdBy` INTEGER NULL,
  `createdByName` VARCHAR(255) NOT NULL,
  `createdByRole` VARCHAR(100) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `forum_replies_threadId_createdAt_idx`(`threadId`, `createdAt`),
  INDEX `forum_replies_villageId_createdAt_idx`(`villageId`, `createdAt` DESC),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `kiosk_devices` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `villageId` INTEGER NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `locationLabel` VARCHAR(255) NULL,
  `keyHash` VARCHAR(64) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `lastSeenAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `kiosk_devices_keyHash_key`(`keyHash`),
  INDEX `kiosk_devices_villageId_isActive_idx`(`villageId`, `isActive`),
  INDEX `kiosk_devices_villageId_lastSeenAt_idx`(`villageId`, `lastSeenAt` DESC),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `website_domains` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `villageId` INTEGER NOT NULL,
  `hostname` VARCHAR(255) NOT NULL,
  `type` VARCHAR(20) NOT NULL,
  `isPrimary` BOOLEAN NOT NULL DEFAULT false,
  `status` VARCHAR(40) NOT NULL DEFAULT 'pending_verification',
  `verificationMethod` VARCHAR(30) NULL,
  `verificationToken` VARCHAR(120) NULL,
  `verificationRequestedAt` DATETIME(3) NULL,
  `verifiedAt` DATETIME(3) NULL,
  `dnsConfig` JSON NULL,
  `routingConfig` JSON NULL,
  `sslStatus` VARCHAR(30) NOT NULL DEFAULT 'pending',
  `sslIssuedAt` DATETIME(3) NULL,
  `lastCheckedAt` DATETIME(3) NULL,
  `lastError` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `website_domains_hostname_key`(`hostname`),
  INDEX `website_domains_villageId_idx`(`villageId`),
  INDEX `website_domains_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `website_domain_events` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `domainId` INTEGER NOT NULL,
  `kind` VARCHAR(50) NOT NULL,
  `message` TEXT NULL,
  `meta` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `website_domain_events_domainId_createdAt_idx`(`domainId`, `createdAt` DESC),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `partner_applications` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(254) NOT NULL,
  `phone` VARCHAR(40) NOT NULL,
  `region` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'NEW',
  `source` VARCHAR(50) NOT NULL DEFAULT 'karir',
  `meta` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `partner_applications_email_idx`(`email`),
  INDEX `partner_applications_status_createdAt_idx`(`status`, `createdAt` DESC),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `partners` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(40) NULL,
  `region` VARCHAR(200) NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'active',
  `lastLogin` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `partners_email_key`(`email`),
  INDEX `partners_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `partner_bank_accounts` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `partnerId` INTEGER NOT NULL,
  `bankName` VARCHAR(80) NOT NULL,
  `accountNumber` VARCHAR(40) NOT NULL,
  `accountName` VARCHAR(120) NOT NULL,
  `isPrimary` BOOLEAN NOT NULL DEFAULT true,
  `verifiedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `partner_bank_accounts_partnerId_idx`(`partnerId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `partner_prospects` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `partnerId` INTEGER NOT NULL,
  `villageName` VARCHAR(255) NOT NULL,
  `district` VARCHAR(255) NULL,
  `regency` VARCHAR(255) NULL,
  `province` VARCHAR(255) NULL,
  `picName` VARCHAR(255) NULL,
  `picPhone` VARCHAR(40) NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'BARU',
  `notes` TEXT NULL,
  `lastContactAt` DATETIME(3) NULL,
  `nextFollowUpAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `partner_prospects_partnerId_status_idx`(`partnerId`, `status`),
  INDEX `partner_prospects_partnerId_createdAt_idx`(`partnerId`, `createdAt` DESC),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `partner_prospect_events` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `prospectId` BIGINT NOT NULL,
  `fromStatus` VARCHAR(30) NULL,
  `toStatus` VARCHAR(30) NOT NULL,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `partner_prospect_events_prospectId_createdAt_idx`(`prospectId`, `createdAt` DESC),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `blog_posts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(200) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `excerpt` TEXT NULL,
  `content` LONGTEXT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'draft',
  `coverImageUrl` TEXT NULL,
  `coverImageAttribution` JSON NULL,
  `seoTitle` VARCHAR(200) NULL,
  `seoDescription` VARCHAR(500) NULL,
  `publishedAt` DATETIME(3) NULL,
  `createdByPlatformUserId` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `blog_posts_slug_key`(`slug`),
  INDEX `blog_posts_status_publishedAt_idx`(`status`, `publishedAt` DESC),
  INDEX `blog_posts_createdAt_idx`(`createdAt` DESC),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `blog_tags` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(80) NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `blog_tags_slug_key`(`slug`),
  UNIQUE INDEX `blog_tags_name_key`(`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `blog_post_tags` (
  `postId` BIGINT NOT NULL,
  `tagId` INTEGER NOT NULL,

  INDEX `blog_post_tags_tagId_idx`(`tagId`),
  PRIMARY KEY (`postId`, `tagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `citizen_reports` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `villageId` INTEGER NOT NULL,
  `reportType` VARCHAR(20) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `images` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `isPublic` BOOLEAN NOT NULL DEFAULT true,
  `reporterName` VARCHAR(255) NOT NULL,
  `reporterNik` VARCHAR(16) NULL,
  `doneById` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `citizen_reports_villageId_status_idx`(`villageId`, `status`),
  INDEX `citizen_reports_villageId_reportType_idx`(`villageId`, `reportType`),
  INDEX `citizen_reports_villageId_createdAt_idx`(`villageId`, `createdAt` DESC),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `citizen_report_responses` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `citizenReportId` BIGINT NOT NULL,
  `villageId` INTEGER NOT NULL,
  `response` TEXT NOT NULL,
  `images` TEXT NULL,
  `responderId` INTEGER NULL,
  `responderName` VARCHAR(255) NOT NULL,
  `responderRole` VARCHAR(100) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `citizen_report_responses_citizenReportId_idx`(`citizenReportId`),
  INDEX `citizen_report_responses_villageId_idx`(`villageId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `work_shifts` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `villageId` INTEGER NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `startTime` VARCHAR(8) NOT NULL,
  `endTime` VARCHAR(8) NOT NULL,
  `lateToleranceMinutes` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `work_shifts_villageId_isActive_idx`(`villageId`, `isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `attendances` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `villageId` INTEGER NOT NULL,
  `officialId` INTEGER NOT NULL,
  `shiftId` INTEGER NULL,
  `attendanceDate` DATE NOT NULL,
  `checkInAt` DATETIME(3) NULL,
  `checkOutAt` DATETIME(3) NULL,
  `status` ENUM('PRESENT', 'LATE', 'ABSENT', 'LEAVE') NOT NULL DEFAULT 'ABSENT',
  `checkInMethod` ENUM('QR', 'GPS') NULL,
  `locationLat` DOUBLE NULL,
  `locationLng` DOUBLE NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `attendances_villageId_attendanceDate_idx`(`villageId`, `attendanceDate`),
  INDEX `attendances_officialId_attendanceDate_idx`(`officialId`, `attendanceDate`),
  UNIQUE INDEX `attendances_villageId_officialId_attendanceDate_key`(`villageId`, `officialId`, `attendanceDate`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `social_benefit_programs` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `villageId` INTEGER NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `periodLabel` VARCHAR(120) NULL,
  `internalNote` TEXT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `social_benefit_programs_villageId_idx`(`villageId`),
  INDEX `social_benefit_programs_villageId_isActive_idx`(`villageId`, `isActive`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `social_benefit_beneficiaries` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `programId` INTEGER NOT NULL,
  `nik` VARCHAR(16) NOT NULL,
  `publicNote` VARCHAR(240) NULL,
  `status` ENUM('registered', 'under_review', 'approved', 'active', 'completed', 'withdrawn') NOT NULL DEFAULT 'registered',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `social_benefit_beneficiaries_nik_idx`(`nik`),
  UNIQUE INDEX `social_benefit_beneficiaries_programId_nik_key`(`programId`, `nik`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `mail_requests_villageId_channel_idx` ON `mail_requests`(`villageId`, `channel`);
CREATE INDEX `officials_villageId_supervisorId_idx` ON `officials`(`villageId`, `supervisorId`);
CREATE INDEX `villages_acquiredByPartnerId_idx` ON `villages`(`acquiredByPartnerId`);

ALTER TABLE `villages` ADD CONSTRAINT `villages_acquiredByPartnerId_fkey` FOREIGN KEY (`acquiredByPartnerId`) REFERENCES `partners`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `admin_notifications` ADD CONSTRAINT `admin_notifications_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `notification_reads` ADD CONSTRAINT `notification_reads_notificationId_fkey` FOREIGN KEY (`notificationId`) REFERENCES `admin_notifications`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `notification_reads` ADD CONSTRAINT `notification_reads_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `officials` ADD CONSTRAINT `officials_supervisorId_fkey` FOREIGN KEY (`supervisorId`) REFERENCES `officials`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `forum_threads` ADD CONSTRAINT `forum_threads_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `forum_threads` ADD CONSTRAINT `forum_threads_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `forum_replies` ADD CONSTRAINT `forum_replies_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `forum_threads`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `forum_replies` ADD CONSTRAINT `forum_replies_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `forum_replies` ADD CONSTRAINT `forum_replies_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `kiosk_devices` ADD CONSTRAINT `kiosk_devices_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `mail_requests` ADD CONSTRAINT `mail_requests_kioskDeviceId_fkey` FOREIGN KEY (`kioskDeviceId`) REFERENCES `kiosk_devices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `website_domains` ADD CONSTRAINT `website_domains_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `website_domain_events` ADD CONSTRAINT `website_domain_events_domainId_fkey` FOREIGN KEY (`domainId`) REFERENCES `website_domains`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `partner_bank_accounts` ADD CONSTRAINT `partner_bank_accounts_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `partner_prospects` ADD CONSTRAINT `partner_prospects_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `partner_prospect_events` ADD CONSTRAINT `partner_prospect_events_prospectId_fkey` FOREIGN KEY (`prospectId`) REFERENCES `partner_prospects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `blog_posts` ADD CONSTRAINT `blog_posts_createdByPlatformUserId_fkey` FOREIGN KEY (`createdByPlatformUserId`) REFERENCES `platform_users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `blog_post_tags` ADD CONSTRAINT `blog_post_tags_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `blog_posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `blog_post_tags` ADD CONSTRAINT `blog_post_tags_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `blog_tags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `citizen_reports` ADD CONSTRAINT `citizen_reports_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `citizen_reports` ADD CONSTRAINT `citizen_reports_doneById_fkey` FOREIGN KEY (`doneById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `citizen_report_responses` ADD CONSTRAINT `citizen_report_responses_citizenReportId_fkey` FOREIGN KEY (`citizenReportId`) REFERENCES `citizen_reports`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `citizen_report_responses` ADD CONSTRAINT `citizen_report_responses_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `citizen_report_responses` ADD CONSTRAINT `citizen_report_responses_responderId_fkey` FOREIGN KEY (`responderId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `work_shifts` ADD CONSTRAINT `work_shifts_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_officialId_fkey` FOREIGN KEY (`officialId`) REFERENCES `officials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `attendances` ADD CONSTRAINT `attendances_shiftId_fkey` FOREIGN KEY (`shiftId`) REFERENCES `work_shifts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `social_benefit_programs` ADD CONSTRAINT `social_benefit_programs_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `social_benefit_beneficiaries` ADD CONSTRAINT `social_benefit_beneficiaries_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `social_benefit_programs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
