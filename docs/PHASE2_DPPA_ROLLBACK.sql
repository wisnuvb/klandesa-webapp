-- Membatalkan PHASE2_DPPA_MIGRATION.sql. Riwayat DPA/DPPA dibuang; DPA, RAK, RAB, dan SPP tetap utuh.
DROP TABLE IF EXISTS `apbdes_activity_plan_versions`;
ALTER TABLE `apbdes_activity_plans` DROP COLUMN `revision`, DROP COLUMN `baseVersion`;
