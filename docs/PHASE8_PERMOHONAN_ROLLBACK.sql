-- Rollback Paket 8 / Permohonan Warga. Menghapus tautan permohonan -> surat (surat itu sendiri tidak terhapus).
DROP INDEX `mail_requests_villageId_mailServiceId_idx` ON `mail_requests`;
ALTER TABLE `mail_requests` DROP COLUMN `mailServiceId`;
