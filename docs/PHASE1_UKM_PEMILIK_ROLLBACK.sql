-- Membatalkan PHASE1_UKM_PEMILIK_MIGRATION.sql. Tautan pemilik hilang; produknya sendiri tetap ada.
-- Produk berstatus `pending`/`hidden` (kiriman warga) perlu ditinjau manual sesudahnya: kode lama hanya mengenal active/inactive.
ALTER TABLE `potentials` DROP FOREIGN KEY `potentials_residentId_fkey`;
DROP INDEX `potentials_residentId_idx` ON `potentials`;
ALTER TABLE `potentials` DROP COLUMN `residentId`;
