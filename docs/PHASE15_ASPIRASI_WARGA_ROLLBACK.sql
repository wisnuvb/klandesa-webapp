-- Rollback Paket 15 (Aspirasi warga). PERINGATAN: menghapus seluruh laporan, tanggapan, klaim, dan area aspirasi.
-- Urutan: anak dulu (FK), lalu induk, lalu kolom contacts.
DROP TABLE IF EXISTS `aspiration_flags`;
DROP TABLE IF EXISTS `aspiration_replies`;
DROP TABLE IF EXISTS `village_claims`;
DROP TABLE IF EXISTS `aspirations`;
DROP TABLE IF EXISTS `aspiration_areas`;
DROP INDEX `contacts_role_createdAt_idx` ON `contacts`;
ALTER TABLE `contacts` DROP COLUMN `position`, DROP COLUMN `role`;
