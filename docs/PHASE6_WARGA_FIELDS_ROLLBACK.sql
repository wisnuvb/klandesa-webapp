-- Rollback PHASE6_WARGA_FIELDS_MIGRATION.sql. Menghapus isi 10 kolom baru (data lama tidak tersentuh).
-- Jalankan HANYA bila kode yang memakai kolom ini sudah ditarik, kalau tidak Prisma Client akan galat.

ALTER TABLE `residents`
    DROP COLUMN `ethnicity`,
    DROP COLUMN `residencyStatus`,
    DROP COLUMN `arrivalDate`,
    DROP COLUMN `originAddress`,
    DROP COLUMN `birthCertNo`,
    DROP COLUMN `ktpStatus`,
    DROP COLUMN `marriageDate`,
    DROP COLUMN `marriageCertNo`,
    DROP COLUMN `passportNo`,
    DROP COLUMN `kitasNo`;
