-- AlterTable
-- Versi sesi web per akun: naik saat kata sandi berubah sehingga cookie sesi lama ditolak. Default 0 = semua sesi yang ada tetap sah.
ALTER TABLE `users` ADD COLUMN `sessionVersion` INTEGER NOT NULL DEFAULT 0;
