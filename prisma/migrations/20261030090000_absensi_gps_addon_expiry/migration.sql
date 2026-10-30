-- AlterTable
-- Add-on GPS absensi berlangganan bulanan: simpan akhir masa berlaku. NULL = tanpa batas (desa yang sudah aktif sebelum kolom ini ada tidak berubah).
ALTER TABLE `villages` ADD COLUMN `absensiGpsAddonExpiry` DATETIME(3) NULL;
