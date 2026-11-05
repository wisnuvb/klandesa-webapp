-- AlterTable
-- Versi sesi web untuk akun platform, regional, dan mitra (sama seperti `users.sessionVersion`): naik saat kata sandi berubah
-- sehingga cookie sesi lama ditolak. Default 0 = semua sesi yang ada tetap sah.
ALTER TABLE `platform_users` ADD COLUMN `sessionVersion` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `regional_users` ADD COLUMN `sessionVersion` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `partners` ADD COLUMN `sessionVersion` INTEGER NOT NULL DEFAULT 0;
