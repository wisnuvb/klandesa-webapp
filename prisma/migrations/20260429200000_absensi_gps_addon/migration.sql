-- AlterTable
ALTER TABLE `villages`
ADD COLUMN `absensiGpsAddonActive` BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN `absensiOfficeLat` DOUBLE NULL,
ADD COLUMN `absensiOfficeLng` DOUBLE NULL,
ADD COLUMN `absensiCheckInRadiusMeters` INTEGER NOT NULL DEFAULT 100;
