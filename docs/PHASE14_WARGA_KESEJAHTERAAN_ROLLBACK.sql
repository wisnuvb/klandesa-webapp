-- Rollback PHASE14_WARGA_KESEJAHTERAAN_MIGRATION.sql. Menghapus isi 6 kolom baru (data lama tidak tersentuh).
-- Jalankan HANYA bila kode yang memakai kolom ini sudah ditarik, kalau tidak Prisma Client akan galat.

ALTER TABLE `residents`
    DROP COLUMN `bpjsType`,
    DROP COLUMN `electricityType`,
    DROP COLUMN `electricityPowerVa`,
    DROP COLUMN `aidPkh`,
    DROP COLUMN `aidBpnt`,
    DROP COLUMN `aidOther`;
