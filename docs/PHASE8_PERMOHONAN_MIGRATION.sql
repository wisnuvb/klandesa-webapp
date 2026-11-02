-- Paket 8 / Permohonan Warga: tautan eksplisit permohonan -> surat terbit. ADITIF: 1 kolom NULL + 1 indeks pada `mail_requests`.
-- Tidak mengubah/menghapus data lama. Rollback: PHASE8_PERMOHONAN_ROLLBACK.sql.

ALTER TABLE `mail_requests`
    ADD COLUMN `mailServiceId` BIGINT NULL;

CREATE INDEX `mail_requests_villageId_mailServiceId_idx` ON `mail_requests`(`villageId`, `mailServiceId`);
