-- Membatalkan PHASE1_UKM_PEMILIK_MIGRATION.sql. Tautan pemilik dan kontak penjual hilang; produknya sendiri tetap ada.
-- Produk berstatus `pending`/`hidden` (kiriman warga) perlu ditinjau manual sesudahnya: kode lama hanya mengenal active/inactive.
-- Kunci `ukm` di `villages.settings` boleh dibiarkan (kode lama mengabaikannya).
ALTER TABLE `potentials` DROP FOREIGN KEY `potentials_residentId_fkey`;
DROP INDEX `potentials_residentId_idx` ON `potentials`;
ALTER TABLE `potentials` DROP COLUMN `residentId`, DROP COLUMN `contactPhone`, DROP COLUMN `contactVisible`;
