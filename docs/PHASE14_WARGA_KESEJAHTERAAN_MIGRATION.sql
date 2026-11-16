-- Paket 14 / Kesejahteraan & hunian warga (jenis BPJS, listrik, jenis bantuan). Permintaan perangkat desa 2026-11-16.
-- ADITIF: 6 kolom pada `residents`; baris lama otomatis NULL / false. Tidak mengubah/menghapus kolom atau data lama.
-- Kepemilikan rumah memakai kolom `houseOwnership` yang sudah ada.
-- Rollback: PHASE14_WARGA_KESEJAHTERAAN_ROLLBACK.sql.

ALTER TABLE `residents`
    ADD COLUMN `bpjsType` VARCHAR(30) NULL,
    ADD COLUMN `electricityType` VARCHAR(20) NULL,
    ADD COLUMN `electricityPowerVa` INTEGER NULL,
    ADD COLUMN `aidPkh` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `aidBpnt` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `aidOther` VARCHAR(255) NULL;
