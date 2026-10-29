-- AlterTable
ALTER TABLE `partner_commission_rules` ADD COLUMN `closingBonusPercent` DECIMAL(5, 2) NULL;

-- Aturan yang masih memakai nominal bawaan lama (Rp500.000, belum diubah admin) dialihkan ke persentase dari harga paket.
-- Nominal yang sudah disesuaikan admin per mitra tetap dipertahankan.
UPDATE `partner_commission_rules` SET `closingBonusPercent` = 10.00 WHERE `closingBonusAmount` = 500000.00;
