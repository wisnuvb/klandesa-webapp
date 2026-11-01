-- Membatalkan PHASE3_RPJM_MIGRATION.sql. Data tahapan RPJM Desa (tim, program, jejak, tanggal, tautan) dan tautan kegiatan RKP Desa ke program dibuang.
-- Dokumen RPJM Desa lama (judul, periode, visi, misi, status), kegiatan RKP Desa, dan musyawarah tetap utuh.
ALTER TABLE `rkpdes_activities` DROP FOREIGN KEY `rkpdes_activities_rpjmProgramId_fkey`;
ALTER TABLE `rkpdes_activities` DROP COLUMN `rpjmProgramId`;
DROP TABLE IF EXISTS `rpjm_events`;
DROP TABLE IF EXISTS `rpjm_programs`;
DROP TABLE IF EXISTS `rpjm_team_members`;
ALTER TABLE `rpjmdes_plans` DROP FOREIGN KEY `rpjmdes_plans_musdesMeetingId_fkey`;
ALTER TABLE `rpjmdes_plans` DROP FOREIGN KEY `rpjmdes_plans_draftMeetingId_fkey`;
ALTER TABLE `rpjmdes_plans` DROP FOREIGN KEY `rpjmdes_plans_legalDocumentId_fkey`;
ALTER TABLE `rpjmdes_plans` DROP COLUMN `draftApprovedAt`, DROP COLUMN `draftApprovedById`, DROP COLUMN `draftMeetingId`, DROP COLUMN `draftMinutesRef`,
    DROP COLUMN `draftReadyAt`, DROP COLUMN `enactedBeforeApp`, DROP COLUMN `headInauguratedOn`, DROP COLUMN `legalDocumentId`, DROP COLUMN `musdesMeetingId`,
    DROP COLUMN `policyDirection`, DROP COLUMN `reopenCount`, DROP COLUMN `reviewDoneAt`, DROP COLUMN `reviewMinutesRef`, DROP COLUMN `reviewSummary`,
    DROP COLUMN `sdgsPlanNote`, DROP COLUMN `sdgsPlanRecordedAt`, DROP COLUMN `teamDecreeRef`, DROP COLUMN `teamFormedAt`;
