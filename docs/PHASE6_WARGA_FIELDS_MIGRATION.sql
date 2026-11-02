-- Paket 6 / Field warga tambahan (suku, status penduduk, akta, KTP-el, perkawinan, dokumen WNA).
-- ADITIF: 10 kolom NULL pada `residents`. Tidak mengubah/menghapus kolom atau data lama.
-- Rollback: PHASE6_WARGA_FIELDS_ROLLBACK.sql.

ALTER TABLE `residents`
    ADD COLUMN `ethnicity` VARCHAR(100) NULL,
    ADD COLUMN `residencyStatus` VARCHAR(20) NULL,
    ADD COLUMN `arrivalDate` DATE NULL,
    ADD COLUMN `originAddress` VARCHAR(500) NULL,
    ADD COLUMN `birthCertNo` VARCHAR(50) NULL,
    ADD COLUMN `ktpStatus` VARCHAR(20) NULL,
    ADD COLUMN `marriageDate` DATE NULL,
    ADD COLUMN `marriageCertNo` VARCHAR(50) NULL,
    ADD COLUMN `passportNo` VARCHAR(30) NULL,
    ADD COLUMN `kitasNo` VARCHAR(30) NULL;
