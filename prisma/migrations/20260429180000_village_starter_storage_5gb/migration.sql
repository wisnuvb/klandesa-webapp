-- Paket starter: kuota arsip = 5 GB (BILLING_CATALOG.arsip.tiers.starter.storageGb).
-- Default kolom diselaraskan; desa starter yang masih 1 GB (default lama) dinaikkan.
ALTER TABLE `villages` MODIFY COLUMN `storageLimit` INTEGER NOT NULL DEFAULT 5;

UPDATE `villages`
SET `storageLimit` = 5
WHERE LOWER(`subscriptionPlan`) = 'starter'
  AND `storageLimit` = 1;
