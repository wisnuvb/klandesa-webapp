-- ROLLBACK Fase 1 kependudukan: mengembalikan skema ke kondisi sebelum SQL aditif. Terbukti identik pada MySQL 8.1 (migrate diff exit 0).
-- PERINGATAN: menghapus tabel baru dan 3 kolom di residents beserta isinya. Aman bila fitur belum dipakai atau data dapat dibangun ulang dengan backfill.

-- DropForeignKey
ALTER TABLE `residents` DROP FOREIGN KEY `residents_villageId_fkey`;

-- DropForeignKey
ALTER TABLE `residents` DROP FOREIGN KEY `residents_householdId_fkey`;

-- DropForeignKey
ALTER TABLE `residents` DROP FOREIGN KEY `residents_wilayahUnitId_fkey`;

-- DropForeignKey
ALTER TABLE `residents` DROP FOREIGN KEY `residents_dusunUnitId_fkey`;

-- DropForeignKey
ALTER TABLE `households` DROP FOREIGN KEY `households_villageId_fkey`;

-- DropForeignKey
ALTER TABLE `households` DROP FOREIGN KEY `households_headResidentId_fkey`;

-- DropForeignKey
ALTER TABLE `households` DROP FOREIGN KEY `households_wilayahUnitId_fkey`;

-- DropForeignKey
ALTER TABLE `households` DROP FOREIGN KEY `households_dusunUnitId_fkey`;

-- DropForeignKey
ALTER TABLE `wilayah_units` DROP FOREIGN KEY `wilayah_units_villageId_fkey`;

-- DropForeignKey
ALTER TABLE `wilayah_units` DROP FOREIGN KEY `wilayah_units_parentId_fkey`;

-- DropForeignKey
ALTER TABLE `resident_mutations` DROP FOREIGN KEY `resident_mutations_villageId_fkey`;

-- DropForeignKey
ALTER TABLE `resident_mutations` DROP FOREIGN KEY `resident_mutations_residentId_fkey`;

-- DropForeignKey
ALTER TABLE `resident_archives` DROP FOREIGN KEY `resident_archives_villageId_fkey`;

-- DropIndex
DROP INDEX `residents_villageId_householdId_idx` ON `residents`;

-- DropIndex
DROP INDEX `residents_villageId_wilayahUnitId_idx` ON `residents`;

-- DropIndex
DROP INDEX `residents_villageId_dusunUnitId_idx` ON `residents`;

-- AlterTable
ALTER TABLE `residents` DROP COLUMN `dusunUnitId`,
    DROP COLUMN `householdId`,
    DROP COLUMN `wilayahUnitId`;

-- DropTable
DROP TABLE `households`;

-- DropTable
DROP TABLE `wilayah_units`;

-- DropTable
DROP TABLE `resident_mutations`;

-- DropTable
DROP TABLE `resident_archives`;

-- AddForeignKey
ALTER TABLE `residents` ADD CONSTRAINT `residents_villageId_fkey` FOREIGN KEY (`villageId`) REFERENCES `villages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

