-- Membatalkan migration.sql (jalankan manual bila perlu; kode lama tidak memakai kolom ini).
ALTER TABLE `officials` DROP FOREIGN KEY `officials_coordinatorId_fkey`;
DROP INDEX `officials_villageId_coordinatorId_idx` ON `officials`;
ALTER TABLE `officials` DROP COLUMN `coordinatorId`;
ALTER TABLE `positions` DROP COLUMN `unit`;
