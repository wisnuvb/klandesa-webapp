-- Produk UKM ditautkan ke warga (pemilik/penjual): hanya MENAMBAH kolom nullable/berdefault, satu indeks, dan satu FK.
-- Data lama tidak berubah (residentId = NULL berarti produk dikelola desa; contactVisible = 0 berarti kontak tidak tampil).
-- Aman dijalankan saat aplikasi lama masih hidup.
-- Status produk UKM bertambah nilai: pending / hidden (kolom `status` sudah VARCHAR bebas, tanpa perubahan skema).
-- Pengaturan "persetujuan produk warga" disimpan di `villages.settings` (JSON, kunci `ukm`), jadi tanpa kolom baru.
ALTER TABLE `potentials` ADD COLUMN `residentId` INTEGER NULL,
    ADD COLUMN `contactPhone` VARCHAR(20) NULL,
    ADD COLUMN `contactVisible` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `potentials_residentId_idx` ON `potentials`(`residentId`);

ALTER TABLE `potentials` ADD CONSTRAINT `potentials_residentId_fkey` FOREIGN KEY (`residentId`) REFERENCES `residents`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
