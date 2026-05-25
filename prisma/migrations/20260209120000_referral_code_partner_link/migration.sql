-- Link referral codes to Partner (operational mitra) for unified flow.
ALTER TABLE `referral_codes` ADD COLUMN `partnerId` INTEGER NULL;

ALTER TABLE `referral_codes`
  ADD UNIQUE INDEX `referral_codes_partnerId_key` (`partnerId`);

ALTER TABLE `referral_codes`
  ADD CONSTRAINT `referral_codes_partnerId_fkey`
  FOREIGN KEY (`partnerId`) REFERENCES `partners`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
