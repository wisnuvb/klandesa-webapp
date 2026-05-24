CREATE TABLE `referral_codes` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(40) NOT NULL,
  `label` VARCHAR(120) NOT NULL,
  `ownerName` VARCHAR(120) NULL,
  `ownerPhone` VARCHAR(40) NULL,
  `ownerEmail` VARCHAR(255) NULL,
  `commission` VARCHAR(80) NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'active',
  `landingPath` VARCHAR(120) NOT NULL DEFAULT '/tim',
  `notes` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `referral_codes_code_key`(`code`),
  INDEX `referral_codes_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `referral_events` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `referralCodeId` INTEGER NULL,
  `codeSnapshot` VARCHAR(40) NULL,
  `action` VARCHAR(50) NOT NULL,
  `sourcePath` VARCHAR(500) NULL,
  `name` VARCHAR(255) NULL,
  `email` VARCHAR(255) NULL,
  `phone` VARCHAR(40) NULL,
  `villageName` VARCHAR(255) NULL,
  `subject` VARCHAR(120) NULL,
  `metadata` JSON NULL,
  `ipAddress` VARCHAR(80) NULL,
  `userAgent` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `referral_events_referralCodeId_createdAt_idx`(`referralCodeId`, `createdAt` DESC),
  INDEX `referral_events_codeSnapshot_createdAt_idx`(`codeSnapshot`, `createdAt` DESC),
  INDEX `referral_events_action_createdAt_idx`(`action`, `createdAt` DESC),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `referral_events` ADD CONSTRAINT `referral_events_referralCodeId_fkey`
  FOREIGN KEY (`referralCodeId`) REFERENCES `referral_codes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
