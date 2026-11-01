-- Produk UKM ditautkan ke warga (pemilik/penjual): hanya MENAMBAH satu kolom nullable, satu indeks, dan satu FK.
-- Data lama tidak berubah (residentId = NULL berarti produk dikelola desa). Aman dijalankan saat aplikasi lama masih hidup.
-- Status produk UKM bertambah nilai: pending / hidden (kolom `status` sudah VARCHAR bebas, tanpa perubahan skema).
ALTER TABLE `potentials` ADD COLUMN `residentId` INTEGER NULL;

CREATE INDEX `potentials_residentId_idx` ON `potentials`(`residentId`);

ALTER TABLE `potentials` ADD CONSTRAINT `potentials_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `residents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
