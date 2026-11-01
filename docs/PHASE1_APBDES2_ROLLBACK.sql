-- Rollback lanjutan APB Desa: urutan memperhatikan kunci asing. Jalankan sebelum PHASE1_APBDES_ROLLBACK.sql.
DROP TABLE `apbdes_panjar_spj`;
DROP TABLE `apbdes_panjars`;
DROP TABLE `apbdes_pay_request_lines`;
DROP TABLE `apbdes_pay_requests`;
DROP TABLE `apbdes_cost_items`;
DROP TABLE `apbdes_cash_plans`;
DROP TABLE `apbdes_activity_plans`;
DROP TABLE `apbdes_external_programs`;
DROP TABLE `village_reports`;
DROP INDEX `apbdes_entries_requestId_idx` ON `apbdes_entries`;
DROP INDEX `apbdes_entries_panjarId_idx` ON `apbdes_entries`;
ALTER TABLE `apbdes_entries` DROP COLUMN `requestId`, DROP COLUMN `panjarId`;
